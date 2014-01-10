// DropboxDataStoreAdapter
// Usage example:
//   App.ApplicationAdapter = DropboxDataStoreAdapter("your dropbox app key here", App);
function DropboxDataStoreAdapter(key, App) {
  // Dropbox Client
  var client = new Dropbox.Client({key: key});
  // Try to finish OAuth authorization.
  client.authenticate({interactive: true}, function(error) {
    if (error) {
      alert('Authentication error: ' + error);
    }
  });
  // Promise for Dropbox.Datastore
  var datastore = new Ember.RSVP.Promise(function(resolve, reject) {
    if (client.isAuthenticated()) {
      var datastoreManager = client.getDatastoreManager();
      datastoreManager.openDefaultDatastore(function(error, datastore) {
        if (error) {
          alert('Error opening default datastore: ' + error);
          reject(error);
        } else {
          observeRemoteChanges(datastore);
          resolve(datastore);
        }
      });
    } else {
      reject("Dropbox.Client not authenticated.");
    }
  });
  // Promise for Dropbox.datastore.Table by name
  function getTable(type) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      datastore.then(function(datastore) {
        var tableName = Ember.Inflector.inflector.pluralize(type.typeKey);
        resolve(datastore.getTable(tableName));
      }).fail(function(error) {
        reject(error);
      });
    });
  }
  // Observe other end of change in the Dropbox DataStore
  function observeRemoteChanges(datastore) {
    datastore.recordsChanged.addListener(function(event) {
      if (!event.isLocal()) {
        var dbRecords = event.affectedRecordsByTable();
        for (var dbTableName in dbRecords) {
          dbRecords[dbTableName].forEach(function(dbRecord) {
            var modelName = Ember.Inflector.inflector.singularize(dbTableName);
            // http://stackoverflow.com/a/19406357/338986
            var store = App.__container__.lookup('store:main');
            store.find(modelName, dbRecord.getId()).then(function(record) {
              if (record) {
                if (dbRecord.isDeleted()) {
                  // delete
                  record.deleteRecord();
                } else {
                  // update
                  record.setProperties(dbRecord.getFields());
                }
              } else {
                // insert
                // NOTE: find() just get the job done. It seems nothing to do here.
              }
            });
          });
        }
      }
    });
  }
  // get Ember.Model by type
  function emberModel(type) {
    return App.get(type.typeKey.capitalize());
  }
  // Convert a dropbox datastore record to an ember record
  function emberRecord(type, dbRecord) {
    var attrNames = Ember.get(emberModel(type), 'attributes').keys.toArray();
    var dbFields = dbRecord.getFields();
    // Not a attribute, so keep it in noAttrs
    var noAttrs = {};
    for (var dbFieldName in dbFields) {
      if (!attrNames.contains(dbFieldName)) {
        noAttrs[dbFieldName] = dbFields[dbFieldName];
      }
    }
    return $.extend(dbFields, {"id": dbRecord.getId(), "noAttrs": noAttrs});
  }
  // Return true if any localFields are changed against remoteFields
  function fieldsChanged(localFields, remoteFields) {
    for (var k in localFields) {
      if (localFields[k] != remoteFields[k]) {
        return true;
      }
    }
    return false;
  }
  // Dropbox DataStore API Ember.js Data Adapter
  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return getTable(type).then(function(dbTable) {
        var dbRecord = dbTable.get(id);
        var value = emberRecord(type, dbRecord);
        return Ember.RSVP.resolve(value);
      }).fail(function(error) {
         console.error(error);
      });
    },
    findAll: function(store, type, since) {
      return getTable(type).then(function(dbTable) {
        var values = $.map(dbTable.query(), function(dbRecord) {
          return emberRecord(type, dbRecord);
        });
        return Ember.RSVP.resolve(values);
      }).fail(function(error) {
         console.error(error);
      });
    },
    findQuery: function(store, type, query, recordArray) {
      return getTable(type).then(function(dbTable) {
        var model = App.get(type.typeKey.capitalize());
        var dbQuery = typeof(model.dbQuery) == "function" ? model.dbQuery(query) : query;
        var values = $.map(dbTable.query(dbQuery), function(dbRecord) {
          return emberRecord(type, dbRecord);
        });
        return Ember.RSVP.resolve(values);
      }).fail(function(error) {
         console.error(error);
      });
    },
    createRecord: function(store, type, record) {
      return getTable(type).then(function(dbTable) {
        var value = record.toJSON();
        var dbFields = $.extend(value, value['noAttrs']);
        delete dbFields['noAttrs'];
        var dbRecord = dbTable.insert(dbFields);
        value['id'] = dbRecord.getId();
        return Ember.RSVP.resolve(value);
      }).fail(function(error) {
         console.error(error);
      });
    },
    updateRecord: function(store, type, record) {
      return getTable(type).then(function(dbTable) {
        var dbRecord = dbTable.get(record.id);
        var emberFields = record.toJSON();
        var dbFields = $.extend(emberFields, emberFields['noAttrs']);
        delete dbFields['noAttrs'];
        // NOTE: Dropbox.Datastore will propagate current values even if no local changes. To prevent echo back of remote chages check if changes are made.
        if (fieldsChanged(dbFields, dbRecord.getFields())) {
          dbRecord.update(dbFields);
        }
        return Ember.RSVP.resolve();
      }).fail(function(error) {
         console.error(error);
      });
    },
    deleteRecord: function(store, type, record) {
      return getTable(type).then(function(dbTable) {
        var dbRecord = dbTable.get(record.id);
        dbRecord.deleteRecord();
        return Ember.RSVP.resolve();
      }).fail(function(error) {
         console.error(error);
      });
    }
  });
  return adapter;
}
// DropboxDataStoreAdapter.Model
// Usage example:
//   App.YourModel = DropboxDataStoreAdapter.Model.extend({...});
DropboxDataStoreAdapter.Model = DS.Model.extend({
  noAttrs: DS.attr(),
});
