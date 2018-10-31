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

const accountModel = getAccountModel();
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

function create (data, cb) {
  update(null, data, cb);
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
  list
};
// [END exports]
