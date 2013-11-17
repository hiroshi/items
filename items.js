(function() {
  // Dropbox Client
  var client = new Dropbox.Client({key: "qidrlfs46ow3v25"});
  //   Try to finish OAuth authorization.
  client.authenticate({interactive: true}, function(error) {
    if (error) {
      alert('Authentication error: ' + error);
    }
  });
  // Ember.js Application
  window.App = Ember.Application.create({
    //LOG_TRANSITIONS: true, 
    //LOG_TRANSITIONS_INTERNAL: true
  });
  // promise for Dropbox datastore
  var datastore = new Ember.RSVP.Promise(function(resolve, reject) {
    if (client.isAuthenticated()) {
      var datastoreManager = client.getDatastoreManager();
      datastoreManager.openDefaultDatastore(function(error, datastore) {
        if (error) {
          alert('Error opening default datastore: ' + error);
          reject(errot);
        } else {
          observeRmoteChanges(datastore);
          resolve(datastore);
        }
      });
    }
  });
  // observe remote changes
  // FIXME: work with other tables than 'items'
  function observeRmoteChanges(datastore) {
    datastore.recordsChanged.addListener(function(event) {
      if (!event.isLocal()) {
        // FIXME: any tables
        var dbRecords = event.affectedRecordsForTable('items');
        dbRecords.forEach(function(dbRecord) {
          App.Item.store.find('item', dbRecord.getId()).then(function(record) {
            if (record) {
              if (dbRecord.isDeleted()) {
                record.deleteRecord();
              } else {
                record.set('title', dbRecord.get('title'));
              }
            } else {
              // NOTE: find() just get the job done. nothing to do here?
            }
          });
        });
      }
    });
  }
  // Dropbox DataStore API Ember.js Data Adapter
  App.DropboxDataStoreAdapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return datastore.then(function(datastore) {
        return new Ember.RSVP.Promise(function(resolve, reject) {
          var table = datastore.getTable(type.tableName);
          var record = table.get(id);
          var value = $.extend(record.getFields(), {"id": record.getId()});
          resolve(value);
        });
      });
    },
    findAll: function(store, type, since) {
      return datastore.then(function(datastore) {
        return new Ember.RSVP.Promise(function(resolve, reject) {
          var table = datastore.getTable(type.tableName);
          var values = $.map(table.query(), function(record) {
            return $.extend(record.getFields(), {"id": record.getId()});
          });
          resolve(values);
        });
      });
    },
    updateRecord: function(store, type, record) {
      return datastore.then(function(datastore) {
        var table = datastore.getTable(type.tableName);
        var dbRecord = table.get(record.id);
        dbRecord.set('title', record.get('title'));
        return Ember.RSVP.resolve();
      });
    },
    // deleteRecord: function(store, type, record) {
    //   return Ember.RSVP.resolve();
    // }
  });
  App.ApplicationAdapter = App.DropboxDataStoreAdapter;
  // App.store = DS.Store.create({
  //   adapter: App.DropboxDataStoreAdapter.create()
  // });
  App.Item = DS.Model.extend({
    title: DS.attr(),
    pos: DS.attr(),
    autoSave: function() {
      this.save();
    }.observes('title')
    // get: function(name) {
    //   console.log(name);
    //   return "hello";
    // }
  })
  App.Item.reopenClass({
    tableName: "items" // FIXME: table name should be converted as plulalization of the model name
  });

  // -> router.js
  App.Router.reopen({
    //location: 'history'
  }); 
  App.Router.map(function() {
    this.resource('items', { path: '/items' }, function() {
      this.resource('item', { path: ':item_id' });
    });
  });
  // Index -> Items
  App.IndexRoute = Ember.Route.extend({
    redirect: function() {
      this.transitionTo('items');
    }
  });
  // Items
  App.ItemsRoute = Ember.Route.extend({
    model: function() {
      return this.get('store').findAll('item');
    },
  });
  App.ItemsController = Ember.ArrayController.extend({
    sortProperties: ['pos'],
    sortAscending: false
  });
  // Item
  App.ItemRoute = Ember.Route.extend({
    model: function(params) {
      return this.get('store').find('item', params.item_id);
    },
    // actions: {
    //   // update: function(item) {
    //   //   console.log(item);
    //   // }
    // }
  });
})();
