'use strict';

const Datastore = require('@google-cloud/datastore');
const config = require('../config');

// [START config]
const ds = Datastore({
  projectId: config.get('GCLOUD_PROJECT')
});
const kind = 'Transaction';
// [END config]

function getAccountModel () {
  return require(`../accounts/model-${require('../config').get('DATA_BACKEND')}`);
}

function getBalanceModel () {
  return require(`../balance/model-${require('../config').get('DATA_BACKEND')}`);
}

const accountModel = getAccountModel();
const balanceModel = getBalanceModel();
// Translates from Datastore's entity format to
// the format expected by the application.
//
// Datastore format:
//   {
//     key: [kind, id],
//     data: {
//       property: value
//     }
//   }
//
// Application format:
//   {
//     id: id,
//     property: value
//   }
function fromDatastore (obj) {
  obj.id = obj[Datastore.KEY].id;
  accountModel.read(obj.lAccount, (err, lAccount) => {
    accountModel.read(obj.rAccount, (err, rAccount) => {
      obj.lAccountDescription = lAccount.description;
      obj.rAccountDescription = rAccount.description;      
    });
  });     
  return obj;
}

// Translates from the application's format to the datastore's
// extended entity property format. It also handles marking any
// specified properties as non-indexed. Does not translate the key.
//
// Application format:
//   {
//     id: id,
//     property: value,
//     unindexedProperty: value
//   }
//
// Datastore extended format:
//   [
//     {
//       name: property,
//       value: value
//     },
//     {
//       name: unindexedProperty,
//       value: value,
//       excludeFromIndexes: true
//     }
//   ]
function toDatastore (obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  const results = [];
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1
    });
  });
  return results;
}

// Lists all books in the Datastore sorted alphabetically by title.
// The ``limit`` argument determines the maximum amount of results to
// return per page. The ``token`` argument allows requesting additional
// pages. The callback is invoked with ``(err, books, nextPageToken)``.
// [START list]
function list (limit, token, cb) {
  const q = ds.createQuery([kind])
    .limit(limit)
    .order('insertDate', {
      descending: true,
    })
    // .order('usingDate', {
    //   descending: true,
    // })
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    //cb(null, entities.map(fromDatastore), hasMore);
    const results = entities.map(async (obj) => { 
      obj.id = obj[Datastore.KEY].id;
      
      const lAccount = await accountModel.readPromise(obj.lAccount);
      obj.lAccountDescription = lAccount.description;
      const rAccount = await accountModel.readPromise(obj.rAccount);
      obj.rAccountDescription = rAccount.description;
      
      return obj
    });
    Promise.all(results).then((completed) => {
      cb(null, completed, hasMore);
    }).catch(err => {
      console.log(err);
    });    
  });
}
// [END list]

//XXX
function entries_OLD (limit, usingDate, account, token, cb) {  
  const q = ds.createQuery([kind])
    .filter('usingDate', '>=', usingDate[0])
    .filter('usingDate', '<=', usingDate[1])
    .limit(limit)
    .order('usingDate', {
      descending: true,
    })
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    //cb(null, entities.map(fromDatastore), hasMore);
    const results = entities.map(async (obj) => { 
      obj.id = obj[Datastore.KEY].id;
      
      const lAccount = await accountModel.readPromise(obj.lAccount);
      obj.lAccountDescription = lAccount.description;
      const rAccount = await accountModel.readPromise(obj.rAccount);
      obj.rAccountDescription = rAccount.description;
      
      return obj
    });
    Promise.all(results).then((completed) => {
      let completeResult = [];
      if (account != undefined && account != "") {
        const completeResult = completed.filter((entry) => {
          if (entry.lAccount == account || entry.rAccount == account){
            return true;
          }
          else {
            return false;
          }
        });
        Promise.all(completeResult).then((filteredResult) => {
          cb(null, filteredResult, hasMore);
        });
      }
      else {
        cb(null, completed, hasMore);
      }      
    }).catch(err => {
      console.log(err);
    });    
  });
  
}

//account가 자산/부체인지 확인
const isBalanceKeepingAccount = async (accountId) => {
  const account = await accountModel.readPromise(accountId);
  if(account.type == "asset" || account.type == "debt") {
    return true;
  }
  else {
    return false;
  }
}

function entries (usingDate, account, token, cb) {  
  const q = ds.createQuery([kind])
    .filter('usingDate', '>=', usingDate[0])
    .filter('usingDate', '<=', usingDate[1])    
    .order('usingDate', {
      descending: true,
    })
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    //cb(null, entities.map(fromDatastore), hasMore);
    if (account != undefined && account != "") {      
      // filter for specified account 
      const filteredEntities = entities.filter((entry) => {
        if (entry.lAccount == account || entry.rAccount == account){
          return true;
        }
        else {
          return false;
        }
      });
      Promise.all(filteredEntities).then((filteredResult) => {      
        const convertingPromise = filteredResult.map(async (obj) => { 
          obj.id = obj[Datastore.KEY].id;
          
          const lAccount = await accountModel.readPromise(obj.lAccount);
          obj.lAccountDescription = lAccount.description;
          const rAccount = await accountModel.readPromise(obj.rAccount);
          obj.rAccountDescription = rAccount.description;
          
          return obj
        });
        Promise.all(convertingPromise).then((completed) => {                
          //account가 자산/부채 인지 확인
          if(isBalanceKeepingAccount(account)) {
            let balanceCursor = completed[completed.length-1].usingDate;            
            //get amount of balanceCursor
            //const balanceAmount = await balanceModel.readPromise(account, balanceCursor);
            balanceModel.readPromise(account, balanceCursor).then((balance) => {                                          
              for (let i = completed.length - 1; i >= 0;i--){
                let transaction = completed[i];
                if(transaction.lAccount == account){
                  balance += Number(transaction.amount);
                  transaction.balance = balance;
                }
                else{
                  balance -= Number(transaction.amount);
                  transaction.balance = balance;
                }
              }
              cb(null, completed, balance);
            }).catch((err) => {              
              cb(err, completed, 0);
            });
          }
          // account is ETC
          else {
            cb(null, completed, 0);
          }             
        }).catch(err => {
          console.log(err);
        });  
      });        // filter    
    }
    else {
      const convertingPromise = entities.map(async (obj) => { 
        obj.id = obj[Datastore.KEY].id;
        
        const lAccount = await accountModel.readPromise(obj.lAccount);
        obj.lAccountDescription = lAccount.description;
        const rAccount = await accountModel.readPromise(obj.rAccount);
        obj.rAccountDescription = rAccount.description;
        
        return obj
      });
      Promise.all(convertingPromise).then((completed) => {        
        cb(null, completed, 0);
      }).catch(err => {
        console.log(err);
      });  
    }
  }); // run query
}

// Creates a new book or updates an existing book with new data. The provided
// data is automatically translated into Datastore format. The book will be
// queued for background processing.
// [START update]
function update (id, data, cb) {
  let key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['amount'])
  };

  ds.save(
    entity,
    (err) => {
      data.id = entity.key.id;
      accountModel.read(data.lAccount, (err, lAccount) => {
        accountModel.read(data.rAccount, (err, rAccount) => {
          data.lAccountDescription = lAccount.description;
          data.rAccountDescription = rAccount.description;
          cb(err, err ? null : data);
        });
      });      
    }
  );
}
// [END update]

function createMultiEntity (data, cb) {
  const entities = [];
  data.forEach(d => {
    let key = ds.key(kind);    
    const entity = {
      key: key,
      data: toDatastore(d, ['amount'])
    };
    entities.push(entity);
  });  

  ds.save(
    entities,
    (err) => {
      accountModel.read(data[0].lAccount, (err, lAccount) => {
        accountModel.read(data[0].rAccount, (err, rAccount) => {
          for(let i = 0; i < data.length; i++){
            data[i].id = entities[i].key.id;
            data[i].lAccountDescription = lAccount.description;
            data[i].rAccountDescription = rAccount.description;
          }          
          cb(err, err ? null : data);
        });
      });      
    }
  );
}

function create (data, cb) {
  if (Array.isArray(data)){
    createMultiEntity(data, cb);
  }
  else {
    update(null, data, cb);
  }
}

function read (id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.get(key, (err, entity) => {
    if (!err && !entity) {
      err = {
        code: 404,
        message: 'Not found'
      };
    }
    if (err) {
      cb(err);
      return;
    }
    cb(null, fromDatastore(entity));
  });
}

function _delete (id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.delete(key, cb);
}

// [START exports]
module.exports = {
  create,
  read,
  update,
  delete: _delete,
  list,
  entries
};
// [END exports]
