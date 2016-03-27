from datetime import datetime, timedelta
from flask import Flask, jsonify, send_from_directory, request, render_template_string
import pandas.io.data as web
import pandas as pd
import numpy
from flask_sqlalchemy import SQLAlchemy
import json
from flask_user import current_user, login_required, UserManager, UserMixin, SQLAlchemyAdapter
from flask_mail import Mail

def create_app():
    app = Flask(__name__)
    app.config.from_envvar('STOCKS_APP_PROPERTIES')
    db = SQLAlchemy(app)
    mail = Mail(app)

    class User(db.Model, UserMixin):
        id = db.Column(db.Integer, primary_key=True)
        username = db.Column(db.String(80), unique=True)
        password = db.Column(db.String(255), nullable=False, server_default='')
        reset_password_token = db.Column(db.String(100), nullable=False, server_default='')

        email = db.Column(db.String(120), unique=True)
        confirmed_at = db.Column(db.DateTime())

        # User information
        active = db.Column('is_active', db.Boolean(), nullable=False, server_default='0')
        first_name = db.Column(db.String(100), nullable=False, server_default='')
        last_name = db.Column(db.String(100), nullable=False, server_default='')


        #def __init__(self, username, password, reset_password_token, email, confirmed_at, active, first_name, last_name):
        #    self.username = username
        #    self.password = password
        #    self.reset_password_token=reset_password_token
        #    self.email = email
        #    self.confirmed_at=confirmed_at
        #    self.active=active
        #    self.first_name=first_name
        #    self.last_name=last_name

        def __repr__(self):
            return '<User %r>' % self.username


    class Stock(db.Model):
        symbol = db.Column(db.String(16), primary_key=True)
        sharesOwned = db.Column(db.String(50))
        averagePricePaid = db.Column(db.Numeric(precision=2))
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)

        def __init__(self, symbol, sharesOwned, averagePricePaid, user_id):
            self.symbol=symbol
            self.sharesOwned=sharesOwned
            self.averagePricePaid=averagePricePaid
            self.user_id=user_id

        def __repr__(self):
            return '<Stock %r>' % self.symbol

        def toDict(self):
            return dict({'symbol': self.symbol, 'sharesOwned': self.sharesOwned, 'averagePricePaid': self.averagePricePaid, 'user_id': self.user_id})

    # Setup Flask-User
    db_adapter = SQLAlchemyAdapter(db, User)        # Register the User model
    user_manager = UserManager(db_adapter, app)     # Initialize Flask-User

    db.create_all()

    @app.route('/api/<symbol>')
    @login_required                                 # Use of @login_required decorator
    def show_stock_basic_stats(symbol):
        start = datetime.now() - timedelta(days=125)
        stock = web.DataReader(symbol, 'yahoo', start, None)
        resp = dict()
        resp['mean']=numpy.mean(stock['Adj Close'][-20:])
        resp['longMean']=numpy.mean(stock['Adj Close'])
        resp['std']=numpy.std(stock['Adj Close'][-20:])
        resp['longStd']=numpy.std(stock['Adj Close'])
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
        #temp_data_set['200d_ma'] = [float(x) for x in pd.rolling_mean(temp_data_set['Adj Close'], window=200)]
        temp_data_set['Bol_upper'] = [float(x) for x in pd.rolling_mean(temp_data_set['Adj Close'], window=20) + 2* pd.rolling_std(temp_data_set['Adj Close'], 20, min_periods=20)]
        temp_data_set['Bol_lower'] = [float(x) for x in pd.rolling_mean(temp_data_set['Adj Close'], window=20) - 2* pd.rolling_std(temp_data_set['Adj Close'], 20, min_periods=20)]
        temp_data_set['Bol_BW'] = [float(x) for x in ((temp_data_set['Bol_upper'] - temp_data_set['Bol_lower'])/temp_data_set['20d_ma'])*100]
        temp_data_set['20d_exma'] = [float(x) for x in pd.ewma(temp_data_set['Adj Close'], span=20)]
        temp_data_set['50d_exma'] = [float(x) for x in pd.ewma(temp_data_set['Adj Close'], span=50)]
        stock = temp_data_set.sort_index(ascending = False ) #reverse back to original
        resp['chart']=[{'x':pd.to_datetime(x).strftime('%Y-%m-%d'),
         'Adj Close':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['Adj Close']),
          '20d_ma':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['20d_ma']),
          '50d_ma':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['50d_ma']),
         'bol_upper':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['Bol_upper']),
         'bol_lower':float(stock[pd.to_datetime(x).strftime('%Y-%m-%d')]['Bol_lower'])} for x in stock.index[0:21]]
        resp['chart'].reverse()
        return jsonify(resp)

    @app.route('/api/portfolio', methods=['GET'])
    @login_required
    def get_portfolio_by_id():
        return jsonify(dict({'results':[x.symbol for x in Stock.query.filter_by(user_id=current_user.id).all()]}))

    @app.route('/api/portfolio', methods=['POST'])
    @login_required
    def update_portfolio_by_id():
        if request.json['action']=='buy':
            newStock = Stock(request.json['symbol'], 0, 0, current_user.id)
            db.session.add(newStock)
            db.session.commit()
            return jsonify(dict({'results':[x.symbol for x in Stock.query.filter_by(user_id=current_user.id).all()]}))
        if request.json['action']=='sell':
            Stock.query.filter_by(symbol=request.json['symbol']).delete()
            db.session.commit()
            return jsonify(dict({'results':[x.symbol for x in Stock.query.filter_by(user_id=current_user.id).all()]}))


    @app.route('/')
    @login_required
    def send_welcome():
        return send_from_directory('dist', 'index.html')

    #@app.route('/')
    #def home_page():
    #    return render_template_string("""
    #        {% extends "base.html" %}
    #        {% block content %}
    #            <h2>Home page</h2>
    #            <p><a href={{ url_for('home_page') }}>Home page</a> (anyone)</p>
    #            <p><a href={{ 'stocks' }}>Stocks page</a> (login required)</p>
    #        {% endblock %}
    #        """)

    @app.route('/app.js')
    def send_app():
        return send_from_directory('dist', 'app.js')

    @app.route('/vendor.js')
    def send_vendor():
        return send_from_directory('dist', 'vendor.js')

    @app.route('/app.32dc9945fd902da8ed2cccdc8703129f.css')
    def send_css():
        return send_from_directory('dist', 'app.32dc9945fd902da8ed2cccdc8703129f.css')

    return app

if __name__ == '__main__':
    #app.run(host="0.0.0.0", port=int("3000"))
    app = create_app()
    app.debug = True
    app.run()
