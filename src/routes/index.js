import React from 'react'
import { Route, IndexRoute } from 'react-router'
import CoreLayout from 'layouts/CoreLayout/CoreLayout'
import StockList from 'components/StockList'

export default (store) => (
  <Route path="/stocks" component={StockList}>
  </Route>
)
