import React from 'react'
import request from 'superagent'
import { Button, ButtonToolbar, Panel, Table } from 'react-bootstrap'
import {VictoryChart, VictoryLine, VictoryAxis} from 'victory'
import NavigationBar from './NavigationBar'

var StockList = React.createClass({

  getInitialState: function () {
    return {selectedStockSymbol: '',
            selectedStockInfo: {},
            stocks: ['AAPL', 'XOM', 'MSFT', 'GOOGL', 'GOOG', 'WFC', 'WMT',
            'GE', 'PG', 'JPM', 'VZ', 'KO', 'PFE', 'T', 'ORCL', 'BAC', 'MMM',
            'ABT', 'ABBV', 'ATVI', 'ADBE', 'ADT', 'AAP', 'STT', 'YHOO'],
            selectedStockHistorical: [],
            haveStockData: false}
  },

  removeSymbol: function (stockToRemove) {
    var stocks = this.state.stocks.filter((stock) => (stock !== stockToRemove))
    this.setState({stocks: stocks})
  },

  getSymbolDetails: function (stock) {
    this.setState({selectedStockSymbol: stock, haveStockData: false})
    if (this.state.selectedStockInfo.symbol !== stock) {
      var path = '/' + stock
      request.get(path).send().end(function (error, resp, body) {
        if (!error && resp.statusCode === 200) {
          resp.body['chart'] = resp.body['chart'].map(
            (data) => {
              return {'x': new Date(data.x),
                       'Adj Close': data['Adj Close'],
                       'bol_upper': data['bol_upper'],
                       'bol_lower': data['bol_lower'] } })
          this.setState({selectedStockInfo: resp.body ? resp.body : {}, haveStockData: true})
          this.setState({selectedStockHistorical: {data: resp.body['chart'], stock: stock}})
        } else {
          alert('Http request to yahoo threw error')
        }
      }.bind(this))
    } else {
      return
    }
  },

  handleBuy: function () {
    event.preventDefault();
    var stocks = this.state.stocks.slice(0)
    stocks.push(this.refs.buySymbol.value.trim())
    this.setState({stocks: stocks})
    this.refs.buySymbol.value = ''
  },

  render () {

    return (
      <div>
        <NavigationBar/>
        <div style={{ padding: 10, paddingTop:2, margin:5, width:'100%' }}>
        <h4 style={{fontFamily:'Abril Fatface'}}>Stock List - Matt Rkiouak</h4>
        {
          !this.state.selectedStockInfo.price&&
          this.state.haveStockData&&
          this.state.stocks.filter(stock=>stock==this.state.selectedStockSymbol).length>0?(
          <div>
            <Button bsStyle='danger' bsSize='xsmall'
            onClick={()=>{this.removeSymbol(this.state.selectedStockSymbol)}}
            style={{marginBottom:'4px'}}>Sell</Button>
            <h5>No Such Stock</h5>
        </div>):(
        this.state.stocks.map((stock, count) =>
        this.state.selectedStockInfo.symbol==stock?(
          <Panel header={stock} key={stock} style={{height:'100%', width:'67%', float:'left', fontFamily:'Abril Fatface'}}>
                <Button bsStyle='danger' bsSize='xsmall'
                  onClick={()=>{this.removeSymbol(stock)}}
                  style={{marginBottom:'4px'}}>Sell</Button>
                  <h6><small>(adjusted close price over the past 20 Days)</small></h6>
                <Table bordered style={{fontFamily:'Arial', height:'100%',width:'100%'}}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Price</th>
                      <th>Mean</th>
                      <th>Standard Deviation</th>
                      <th>Lower 2 STD Boundary</th>
                      <th>Upper 2 STD Boundary</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{this.state.selectedStockInfo.symbol}</td>
                      <td>{Math.round(this.state.selectedStockInfo.price * 100) /100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.mean*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.std*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.lowerLimit*100)/100}</td>
                      <td>{Math.round(this.state.selectedStockInfo.upperLimit*100)/100}</td>
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
                    'y':[this.state.selectedStockInfo.lowerLimit-
                      (this.state.selectedStockInfo.std*1.3),
                       this.state.selectedStockInfo.upperLimit+(this.state.selectedStockInfo.std*1.3)
                     ]
                   }}
                   scale={{'x':'time'}}
                   >
                   <VictoryLine
                     style={{  height:'100%',
                                            wdith:'100%',data:{strokeWidth: 2}}}
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
                  </VictoryChart>):''}
            </Panel>):''))}
            <div style={{float:'right', width:'31%'}}>
              <input type='text' ref='buySymbol'></input>
              <Button type='submit' style={{marginLeft:'3px'}} onClick={this.handleBuy} bsSize='xsmall' bsStyle='success'>Buy</Button>
              <br/>
              <h6 style={{fontFamily:'Abril Fatface'}}>Select:</h6><ButtonToolbar>
                {this.state.stocks.map(stock =>
                  <Button bsSize='small' style={{marginBottom:'2px'}} key={stock} onClick={()=>{this.getSymbolDetails(stock)}}><a>{stock}</a></Button>
                )}
              </ButtonToolbar>
            </div>
          </div>
        </div>
        )
      }
    });

    export default StockList