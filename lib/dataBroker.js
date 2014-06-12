var mongodb = require('mongodb');

var log = require('./log.js')('dataBroker.js');

module.exports = function(config){
  var mongoClient = null;

  return {
    getDataStream: function(streamId, cb) {
      if (mongoClient == null) {
        return cb({ message: 'Must start the dataBroker before using it.' });
      }

      mongoClient.collection('deviceData', function(err, collection) {
        if (err != null) {
          return cb(err);
        }

        collection.count({ groupId: streamId }, function(err, count){
          if (err != null) {
            return cb(err);
          }

/*
          This code is commented out because it is intended as the actual code to go live with, but for
          demo purposes, we are merging the old and new streams together.  Before June 19th, 2014, The code
          below should be reinstated and the code doing a find with the $or clause should be deleted.

          if (count > 0) {
            cb(null, collection.find({ groupId: streamId }).sort('deviceTime', 'asc').stream());
          } else {
            cb(null, collection.find({ _groupId: streamId, _active: true }).sort('time', 'asc').stream());
          }
*/
          cb(null, collection.find({ $or: [{groupId: streamId}, { _groupId: streamId, _active: true }]}).stream());
        });
      });
    },

    start: function(cb){
      if (mongoClient != null) {
        return;
      }

      if (cb == null) {
        cb = function(err) {
          if (err != null) {
            log.warn(err, 'Error connection to mongo!');
            return;
          }
          log.info('Successfully connected to mongo');
        }
      }

      mongodb.MongoClient.connect(config.mongoConnectionString, function(err, db){
        if (db != null) {
          if (mongoClient != null) {
            db.close();
            return;
          }
          mongoClient = db;
          mongoClient.collection('deviceData', function(err, collection){
            if (err == null) {
              collection.ensureIndex({'groupId': 1, 'deviceTime': 1}, {background: true}, function(error, indexName){
                if (error != null) {
                  log.info(error, 'Unable to create deviceTime index due to error');
                }
                log.info('Index[%s] alive and kicking.', indexName);
                collection.ensureIndex({'_groupId': 1, 'time': 1, '_active': 1}, {background: true}, function(error, indexName){
                  if (error != null) {
                    log.info(error, 'Unable to create time index due to error');
                  }
                  log.info('Index[%s] alive and kicking.', indexName);
                });
              });
            }
          });
        }

        cb(err);
      });
    },
    close: function() {
      if (mongoClient != null) {
        mongoClient.close();
        mongoClient = null;
      }
    }
  }
};