from datetime import datetime, timedelta
from flask import Flask, jsonify, send_from_directory
import pandas.io.data as web
import pandas as pd
import numpy
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
#app.config.from_envvar('STOCKS_APP_PROPERTIES')
@app.route('/api/<symbol>')
def show_stock_basic_stats(symbol):
    start = datetime.now() - timedelta(days=100)
    stock = web.DataReader(symbol, 'yahoo', start, None)
    resp = dict()
    resp['mean']=numpy.mean(stock['Adj Close'])
    resp['std']=numpy.std(stock['Adj Close'])
    resp['upperLimit']=resp['mean']+(resp['std']*2)
    resp['lowerLimit']=resp['mean']-(resp['std']*2)
    resp['symbol']=symbol
    resp['price']=stock['Adj Close'][-1]
    #resp['Adj Close']=[{'x':pd.to_datetime(x).strftime('%Y-%m-%d'), 'y':stock.ix[pd.to_datetime(x).strftime('%Y-%m-%d')]['Adj Close']} for x in stock.index]

    stock['Date'] =  pd.to_datetime( stock.index)
    temp_data_set = stock.sort('Date',ascending = True ) #sort to calculate the rolling mean
    temp_data_set['20d_ma'] = [float(x) for x in pd.rolling_mean(temp_data_set['Adj Close'], window=20)]
    temp_data_set['50d_ma'] = [float(x) for x in pd.rolling_mean(temp_data_set['Adj Close'], window=50)]
    temp_data_set['Bol_upper'] = [float(x) for x in pd.rolling_mean(temp_data_set['Adj Close'], window=20) + 2* pd.rolling_std(temp_data_set['Adj Close'], 20, min_periods=20)]
    temp_data_set['Bol_lower'] = [float(x) for x in pd.rolling_mean(temp_data_set['Adj Close'], window=20) - 2* pd.rolling_std(temp_data_set['Adj Close'], 20, min_periods=20)]
    temp_data_set['Bol_BW'] = [float(x) for x in ((temp_data_set['Bol_upper'] - temp_data_set['Bol_lower'])/temp_data_set['20d_ma'])*100]
    temp_data_set['20d_exma'] = [float(x) for x in pd.ewma(temp_data_set['Adj Close'], span=20)]
    temp_data_set['50d_exma'] = [float(x) for x in pd.ewma(temp_data_set['Adj Close'], span=50)]
    stock = temp_data_set.sort_index(ascending = False ) #reverse back to original
    resp['chart']=[{'x':pd.to_datetime(x).strftime('%Y-%m-%d'), 'Adj Close':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['Adj Close']), '20d_ma':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['20d_ma']),
     'bol_upper':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['Bol_upper']),
     'bol_lower':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['Bol_lower'])} for x in stock.index[0:21]]
    resp['chart'].reverse()
    return jsonify(resp)

@app.route('/')
def send_welcome():
    return send_from_directory('dist', 'index.html')

@app.route('/app.js')
def send_app():
    return send_from_directory('dist', 'app.js')

@app.route('/vendor.js')
def send_vendor():
    return send_from_directory('dist', 'vendor.js')

@app.route('/app.32dc9945fd902da8ed2cccdc8703129f.css')
def send_css():
    return send_from_directory('dist', 'app.32dc9945fd902da8ed2cccdc8703129f.css')

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int("3000"))
    #app.debug = True
    #app.run()
