import React from 'react'
import request from 'superagent'
import { Button, ButtonToolbar, Panel, Table } from 'react-bootstrap'
import {VictoryChart, VictoryLine, VictoryAxis} from 'victory'
import NavigationBar from './NavigationBar'
import {Treemap} from 'react-d3'
import NumberPicker from 'react-widgets/lib'

var StockList = React.createClass({

  getInitialState: function () {
    return {selectedStockSymbol: '',
            selectedStockInfo: {},
            stocks: [],
            selectedStockHistorical: [],
            haveStockData: false}
  },
  componentDidMount: function () {
    request.get('/api/portfolio').send().end(function(error, resp, body){
      if(!error && resp.statusCode === 200) {
        console.log(resp)
        this.setState({'stocks':resp.body.results.map((x)=>x.symbol),
                      'holdings':resp.body.results.map((x)=>({'label':x.symbol, 'value':x.holding}))})
      } else {
        console.log('error retrieving portfolio')
      }

    }.bind(this))
  },

  getSymbolDetails: function (stock) {
    this.setState({selectedStockSymbol: stock, haveStockData: false})
    if (this.state.selectedStockInfo.symbol !== stock) {
      var path = '/api/' + stock
      request.get(path).send().end(function (error, resp, body) {
        if (!error && resp.statusCode === 200) {
          resp.body['chart'] = resp.body['chart'].map(
            (data) => {
              return {'x': new Date(data.x),
                       'Adj Close': data['Adj Close'],
                       'bol_upper': data['bol_upper'],
                       'bol_lower': data['bol_lower'],
                       '20d_ma': data['20d_ma'],
                       '50d_ma': data['50d_ma']} })
          this.setState({selectedStockInfo: resp.body ? resp.body : {}, haveStockData: true})
          this.setState({selectedStockHistorical: {data: resp.body['chart'], stock: stock}})
        } else {
          this.setState({selectedStockInfo:{'symbol':stock}, haveStockData: true})
          console.log('Http request to yahoo threw error')
        }
      }.bind(this))
    } else {
      return
    }
  },

  removeSymbol: function (stockToRemove) {
    request.post('/api/portfolio')
    .send({'action':'sell', 'symbol':stockToRemove})
        .end(function (error, resp, body) {
          if(!error && resp.statusCode === 200) {
            console.log(resp)
            this.setState({'stocks':resp.body.results.map((x)=>x.symbol),
                          'holdings':resp.body.results.map((x)=>({'label':x.symbol, 'value':x.holding}))})
            this.refs.buySymbol.value = ''
          } else {
            console.log('error retrieving portfolio')
          }
    }.bind(this))
  },

  handleBuy: function () {
    event.preventDefault();
    request.post('/api/portfolio')
    .send({'action':'buy', 'symbol':this.refs.buySymbol.value.trim()})
        .end(function (error, resp, body) {
          if(!error && resp.statusCode === 200) {
            console.log(resp)
            console.log(resp.body.results.map((x)=>({'label':x.symbol, 'value':x.holding})))
            this.setState({'stocks':resp.body.results.map((x)=>x.symbol),
                          'holdings':resp.body.results.map((x)=>({'label':x.symbol, 'value':x.holding}))})
            this.refs.buySymbol.value = ''
          } else {
            console.log('error retrieving portfolio')
          }
    }.bind(this))
  },

  render () {
    console.log("stocks: ", this.state.stocks)
    console.log("holdings: ", this.state.holdings)
    return (
      <div>
        <NavigationBar/>
        <div style={{ padding: 10, paddingTop:2, margin:5, width:'100%' }}>
        <h4 style={{fontFamily:'Abril Fatface'}}>Stock List - Matt Rkiouak</h4>
        <div style={{float:'top', width:'31%'}}>
          <input type='text' ref='buySymbol'></input>
          <Button type='submit' style={{marginLeft:'3px'}} onClick={this.handleBuy} bsSize='xsmall' bsStyle='success'>Buy</Button>
          <br/>
          <h6 style={{fontFamily:'Abril Fatface'}}>Select:</h6><ButtonToolbar>
            {this.state.stocks.length>0?(this.state.stocks.map(stock =>
              <Button bsSize='small' style={{marginBottom:'2px'}} key={stock} onClick={()=>{this.getSymbolDetails(stock)}}><a>{stock}</a></Button>
            )):'Enter a stock symbol and click \'Buy\'.'}
          </ButtonToolbar>
          <Treemap
            data={this.state.holdings}
            width={450}
            height={250}
            textColor="#484848"
            fontSize="12px"
            title="Portfolio Allocation"
            hoverAnimation={false}
          />
        </div>
        {
          !this.state.selectedStockInfo.price&&
          this.state.haveStockData&&
          this.state.stocks.filter(stock=>stock==this.state.selectedStockSymbol).length>0?(
          <div>
            <Button bsStyle='danger' bsSize='xsmall'
            onClick={()=>{this.removeSymbol(this.state.selectedStockSymbol)}}
            style={{marginBottom:'4px'}}>Sell</Button>
          <h5>No Such Stock Or No Symbol Data Available</h5>
        </div>):(
        this.state.stocks.map((stock, count) =>
        this.state.selectedStockInfo.symbol==stock?(
          <Panel header={stock} key={stock} style={{height:'100%', width:'67%', float:'left', fontFamily:'Abril Fatface', marginTop:8}}>
                <Button bsStyle='danger' bsSize='xsmall'
                  onClick={()=>{this.removeSymbol(stock)}}
                  style={{marginBottom:'4px'}}>Sell</Button>
                  <h6><small>(adjusted close price over the past 20 Days)</small></h6>
                <Table bordered style={{fontFamily:'Arial', height:'100%',width:'100%'}}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Price</th>
                      <th>20 Day Mean</th>
                      <th>125 Day Mean</th>
                      <th>20 Day Standard Deviation</th>
                      <th>125 Day Standard Deviation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{this.state.selectedStockInfo.symbol}</td>
                      <td>{Math.round(this.state.selectedStockInfo.price * 100) /100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.mean*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.longMean*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.std*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.longStd*100)/100}</td>
                    </tr>
                  </tbody>
                </Table>
                <Table bordered style={{fontFamily:'Arial', height:'100%',width:'100%'}}>
                  <thead>
                    <tr>
                      <th>Lower 2 STD Boundary</th>
                      <th>Upper 2 STD Boundary</th>
                      <th>Yesterday's Price Change (Percent)</th>
                      <th>Yesterday's Price Move (Absolute)</th>
                      <th>Yesterday's Volume</th>
                      <th>Average Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{Math.round(this.state.selectedStockInfo.lowerLimit*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.upperLimit*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.yesterdayPriceMove*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.yesterdayPriceMovePercent*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.lastDayVolume*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.avgVolume*100)/100}</td>
                    </tr>
                  </tbody>
                </Table>
                <h6 style={{fontFamily:'Arial'}}> <small><i>(Consider contrarian Bollinger Band trading, where
                if the current ask is above the upper bound line, sell & if the current price is below the lower bound line, buy.
              This outlook is more in line with stronger efficient market hypotheses and fundamental analysis)</i></small></h6>
                {this.state.selectedStockHistorical.stock==stock&&this.state.selectedStockHistorical.data.length!=0?(
                  <VictoryChart
                    height={'275'}
                    width={'620'}
                    domain={{'x':[this.state.selectedStockHistorical.data[0].x, this.state.selectedStockHistorical.data[this.state.selectedStockHistorical.data.length-1].x],
                    'y':[this.state.selectedStockInfo.lowerLimit-(this.state.selectedStockInfo.longStd*1.70),
                       this.state.selectedStockInfo.upperLimit+(this.state.selectedStockInfo.longStd*1.70)
                     ]
                   }}
                   scale={{'x':'time'}}
                   >
                   <VictoryLine
                     style={{  height:'100%',
                                            width:'100%',data:{strokeWidth: 2}}}
                     data={this.state.selectedStockHistorical.data.map((data)=>{return {'x':data.x, 'y':data['Adj Close']}})}
                     label={'adj close'}
                   />
                   <VictoryLine
                     style={{
                       height:'100%',
                       wdith:'100%',
                       data: {
                         stroke: '#B0171F',
                         strokeWidth: 1,
                         ':hover': {stroke: '#FF0000'}
                       }
                     }}
                     data={this.state.selectedStockHistorical.data.map(
                       (data)=>{return {'x':data.x, 'y':data['bol_upper']}}
                     )}
                     label='upr bnd'
                   />
                   <VictoryLine
                     style={{
                       height:'100%',
                       width:'100%',
                       data: {
                         stroke: '#6666ff',
                         strokeWidth: 1,
                         ':hover': {stroke: '#b2b2ff'}
                       }
                     }}
                     data={this.state.selectedStockHistorical.data.map(
                       (data)=>{return {'x':data.x, 'y':data['bol_lower']}}
                     )}
                     label='lwr bnd'
                   />
                    <VictoryAxis
                      label='Time'
                      tickCount={4}
                      orientation='bottom'
                      tickFormat={(date)=>date.toLocaleDateString()}
                      />
                      <VictoryAxis dependentAxis
                        label='Ask'
                      />
                      <VictoryLine
                        style={{
                          height:'100%',
                          wdith:'100%',
                          data: {
                            stroke: '#1F6E51',
                            strokeWidth: 1,
                            ':hover': {stroke: '#FF0000'}
                          }
                        }}
                        data={this.state.selectedStockHistorical.data.map(
                          (data)=>{return {'x':data.x, 'y':data['50d_ma']}}
                        )}
                        label='50d ma'
                      />
                      <VictoryLine
                        style={{
                          height:'100%',
                          wdith:'100%',
                          data: {
                            stroke: '#ffcc66',
                            strokeWidth: 1,
                            ':hover': {stroke: '#FF0000'}
                          }
                        }}
                        data={this.state.selectedStockHistorical.data.map(
                          (data)=>{return {'x':data.x, 'y':data['20d_ma']}}
                        )}
                        label='20d ma'
                      />
                  </VictoryChart>):''}
            </Panel>):''))}
          </div>
        </div>
        )
      }
    });

    export default StockList
