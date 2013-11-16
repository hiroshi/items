(function() {
  // Dropbox Client
  var client = new Dropbox.Client({key: "qidrlfs46ow3v25"});
  //   Try to finish OAuth authorization.
  client.authenticate({interactive: true}, function (error) {
    if (error) {
      alert('Authentication error: ' + error);
    }
  });
  // Ember.js Application
  window.App = Ember.Application.create({
    //LOG_TRANSITIONS: true, 
    //LOG_TRANSITIONS_INTERNAL: true
  });
  // Dropbox DataStore API Ember.js Data Adapter
  App.DropboxDataStoreAdapter = DS.Adapter.extend({
    // promise for Dropbox datastore
    _datastore: new Ember.RSVP.Promise(function (resolve, reject) {
      if (client.isAuthenticated()) {
        var datastoreManager = client.getDatastoreManager();
        datastoreManager.openDefaultDatastore(function (error, datastore) {
          if (error) {
            alert('Error opening default datastore: ' + error);
            reject(errot);
          } else {
            resolve(datastore);
          }
        });
      }
    }),
    find: function(store, type, id) {
      return this._datastore.then(function(datastore) {
        return new Ember.RSVP.Promise(function (resolve, reject) {
          var table = datastore.getTable(type.tableName);
          var record = table.get(id);
          var value = $.extend(record.getFields(), {"id": record.getId()});
          resolve(value);
        });
      });
    },
    findAll: function(store, type, since) {
      return this._datastore.then(function(datastore) {
        return new Ember.RSVP.Promise(function (resolve, reject) {
          var table = datastore.getTable(type.tableName);
          var values = $.map(table.query(), function (record) {
            return $.extend(record.getFields(), {"id": record.getId()});
          });
          resolve(values);
        });
      });
    }
  });
  App.ApplicationAdapter = App.DropboxDataStoreAdapter;
  // App.store = DS.Store.create({
  //   adapter: App.DropboxDataStoreAdapter.create()
  // });
  App.Item = DS.Model.extend({
    title: DS.attr()
  })
  App.Item.reopenClass({
    tableName: "items" // FIXME: table name should be converted as plulalization of the model name
  });

  // -> router.js
  App.Router.reopen({
    //location: 'history'
  }); 
  App.Router.map(function () {
    this.resource('items', { path: '/items' }, function () {
      this.resource('item', { path: ':item_id' });
    });
  });
  App.ItemsRoute = Ember.Route.extend({
    model: function() {
      return this.get('store').findAll('item');
    }
  });
  App.ItemRoute = Ember.Route.extend({
    model: function(params) {
      return this.get('store').find('item', params.item_id);
    },
    actions: {
      update: function(item) {
        console.log(item);
      }
    }
  });
  App.IndexRoute = Ember.Route.extend({
    redirect: function() {
      this.transitionTo('items');
    }
  });
})();
