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

//require('@google-cloud/debug-agent').start();

const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');

const app = express();
app.locals.moment = require('moment');

app.disable('etag');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', true);

app.use(session({
	secret: '1afd2sdfwerwersdfserwerf', 
	resave: false,
	saveUninitialized: true
}));

// books
app.use('/books', require('./books/crud'));
app.use('/api/books', require('./books/api'));

// transactions
app.use('/transactions', require('./transactions/crud'));
app.use('/api/transactions', require('./transactions/api'));
app.use('/entries', require('./transactions/entries'));

// accounts
app.use('/accounts', require('./accounts/crud'));
app.use('/api/accounts', require('./accounts/api'));

// login/out
app.use('/logins', require('./login'));

app.use(express.static('public'));
app.use('/favicon.ico', express.static('favicon.ico'));

// Redirect root to /transactions
app.get('/', (req, res) => {
  res.redirect('/transactions');
});

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Basic error handler
app.use((err, req, res, next) => {
  /* jshint unused:false */
  console.error(err);
  // If our routes specified a specific response, then send that. Otherwise,
  // send a generic message so as not to leak anything.
  res.status(500).send(err.response || 'Something broke!');
});

if (module === require.main) {
  // Start the server
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;
