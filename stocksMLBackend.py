from datetime import datetime, timedelta
from flask import Flask, jsonify, send_from_directory, request
import pandas.io.data as web
import pandas as pd
import numpy
from flask_sqlalchemy import SQLAlchemy
import json

app = Flask(__name__)
app.config.from_envvar('STOCKS_APP_PROPERTIES')
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)
    email = db.Column(db.String(120), unique=True)

    def __init__(self, username, email):
        self.username = username
        self.email = email

    def __repr__(self):
        return '<User %r>' % self.username

class Stock(db.Model):
    symbol = db.Column(db.String(16), primary_key=True)
    sharesOwned = db.Column(db.String(50))
    averagePricePaid = db.Column(db.Numeric(precision=2))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def __init__(self, symbol, sharesOwned, averagePricePaid, user_id):
        self.symbol=symbol
        self.sharesOwned=sharesOwned
        self.averagePricePaid=averagePricePaid
        self.user_id=user_id

    def __repr__(self):
        return '<Stock %r>' % self.symbol

    def toDict(self):
        return dict({'symbol': self.symbol, 'sharesOwned': self.sharesOwned, 'averagePricePaid': self.averagePricePaid, 'user_id': self.user_id})

@app.route('/api/<symbol>')
def show_stock_basic_stats(symbol):
    start = datetime.now() - timedelta(days=100)
    stock = web.DataReader(symbol, 'yahoo', start, None)
    #print(stock)
    resp = dict()
    resp['mean']=numpy.mean(stock['Adj Close'])
    resp['std']=numpy.std(stock['Adj Close'])
    resp['upperLimit']=resp['mean']+(resp['std']*2)
    resp['lowerLimit']=resp['mean']-(resp['std']*2)
    resp['symbol']=symbol
    resp['price']=stock['Adj Close'][-1]
    resp['lastDayVolume']=stock['Volume'][-1]
    resp['avgVolume']=numpy.mean(stock['Volume'])
    resp['yesterdayPriceMove']=stock['Adj Close'][-1]-stock['Adj Close'][-2]
    resp['yesterdayPriceMovePercent']=resp['yesterdayPriceMove']/stock['Adj Close'][-2]
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
    #print(resp)
    return jsonify(resp)

@app.route('/api/portfolio/<id>', methods=['GET'])
def get_portfolio_by_id(id):
    return jsonify(dict({'results':[x.symbol for x in Stock.query.filter_by(user_id=id).all()]}))

@app.route('/api/portfolio/<id>', methods=['POST'])
def update_portfolio_by_id(id):
    if request.json['action']=='buy':
        newStock = Stock(request.json['symbol'], 0, 0, id)
        db.session.add(newStock)
        db.session.commit()
        return jsonify(dict({'results':[x.symbol for x in Stock.query.filter_by(user_id=id).all()]}))
    if request.json['action']=='sell':
        Stock.query.filter_by(symbol=request.json['symbol']).delete()
        db.session.commit()
        return jsonify(dict({'results':[x.symbol for x in Stock.query.filter_by(user_id=id).all()]}))


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
    #app.run(host="0.0.0.0", port=int("3000"))
    app.debug = True
    app.run()
