// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const moment = require('moment');

const express = require('express');
const _ = require('underscore');
const bodyParser = require('body-parser');

function getModel () {
  return require(`./model-${require('../config').get('DATA_BACKEND')}`);
}

function getAccountModel () {
  return require(`../accounts/model-${require('../config').get('DATA_BACKEND')}`);
}

function numberWithCommas(number) {
  var parts = number.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

const router = express.Router();

// Automatically parse request body as form data
router.use(bodyParser.urlencoded({ extended: false }));

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

/**
 * GET /transactions
 *
 * Display a page of transactions (up to ten at a time).
 */
router.get('/', (req, res, next) => {    
  var sess = req.session;
  if(sess.username){
    getAccountModel().list(null, (err, accounts) => {  
      if (err) {
        next(err);
        return;
      }      

      let LusingDate = moment(Date.now()).subtract(15, 'days').format('YYYYMMDD');
      let RusingDate = moment(Date.now()).format('YYYYMMDD');
      if (req.query.LusingDate != undefined && req.query.RusingDate != undefined){
        LusingDate = req.query.LusingDate;
        RusingDate = req.query.RusingDate;
      }  
      if (!req.query.account) {
        req.query.account = "";
      }
      
      getModel().entries([LusingDate, RusingDate], req.query.account, req.query.pageToken, (err, entities, balance) => {
        if (err) {
          next(err);
          return;
        }     
        
        entities.forEach((entity)=>{
          entity.amount = numberWithCommas(entity.amount);
          if (entity.balance){
            entity.balance = numberWithCommas(entity.balance);
          }
        });

        if (req.query.resType == "html") {
          var pug = require('pug');             
          var fn = pug.compileFile('/home/valkun/git/bokssigi/views/transactions/partialTable.pug', null);      
          var html = fn({
            transactions: entities,            
            accounts: accounts,
            balance: balance,
            LusingDate: LusingDate,
            RusingDate: RusingDate,
            selectedAccount: req.query.account,
            moment: moment            
          });          
          res.status(200).send({html: html});
        }   
        else {
          res.render('transactions/list.pug', {
            transactions: entities,            
            accounts: accounts,
            LusingDate: LusingDate,
            RusingDate: RusingDate,
            selectedAccount: req.query.account,
            balance: balance
          });
        }         
      });
    });
  }
  else{
    res.render('login/login.pug');
  }
});

/**
 * Errors on "/transactions/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;
