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
      getModel().list(5, req.query.pageToken, (err, entities, cursor) => {
        if (err) {
          next(err);
          return;
        }     
        
        entities.forEach((entity)=>{
          entity.amount = numberWithCommas(entity.amount);
        });

        if (req.query.resType == "html") {
          var pug = require('pug');             
          var fn = pug.compileFile('/home/valkun/git/bokssigi/views/transactions/partialTable.pug', null);      
          var html = fn({
            transactions: entities,            
            accounts: accounts,
            nextPageToken: cursor,
            moment: moment
          });          
          res.status(200).send({html: html, nextPageToken: cursor });
        }   
        else {
          res.render('transactions/insert.pug', {
            transactions: entities,            
            accounts: accounts,
            nextPageToken: cursor
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
 * GET /transactions/add
 *
 * Display a form for creating a account.
 */
// [START add_get]
router.get('/add', (req, res) => {
  res.render('transactions/form.pug', {
    account: {},
    action: 'Add'
  });
});
// [END add_get]

/**
 * POST /transactions/add
 *
 * Create a account.
 */
// [START add_post]
router.post('/add', (req, res, next) => {
  let data = req.body;
  let entities = [];
  if(data.description.includes('**')){
    let token = data.description.split('**')
    let count = parseInt(token[1]);
    if(count > 1){      
      for (let i = 0; i < count;i++){   
        let d = _.clone(data);
        d.description = token[0] + ` (${i+1}/${count})`;
        d.insertDate = "" + parseInt(data.insertDate)+i;
        d.usingDate = moment(data.usingDate, "YYYYMMDD").add(i, 'months').format('YYYYMMDD');
        entities.push(d)
      }
    }else{
      entities = data;            
    }    
  }
  else {
    entities = data;  
  }
  // Save the data to the database.
  getModel().create(entities, (err, savedData) => {
    if (err) {
      next(err);
      return;
    }
    //res.redirect(`${req.baseUrl}/${savedData.id}`);
    res.send(savedData);
    //res.redirect(`${req.baseUrl}`);
  });
});
// [END add_post]

/**
 * GET /transaction/:id/edit
 *
 * Display a account for editing.
 */
router.get('/:transaction/edit', (req, res, next) => {
  getModel().read(req.params.transaction, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('transactions/form.pug', {
      account: entity,
      action: 'Edit'
    });
  });
});

/**
 * POST /transaction/:id/edit
 *
 * Update a account.
 */
router.post('/:transaction/edit', (req, res, next) => {
  const data = req.body;

  getModel().update(req.params.transaction, data, (err, savedData) => {
    if (err) {
      next(err);
      return;
    }
    //res.redirect(`${req.baseUrl}/${savedData.id}`);
    res.send(savedData);
  });
});

/**
 * GET /transaction/:id
 *
 * Display a account.
 */
router.get('/:transaction', (req, res, next) => {
  getModel().read(req.params.transaction, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('transactions/insert.pug', {
      account: entity
    });
  });
});

/**
 * GET /transaction/:id/delete
 *
 * Delete a account.
 */
router.get('/:transaction/delete', (req, res, next) => {
  getModel().delete(req.params.transaction, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
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
