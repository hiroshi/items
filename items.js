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
  // promise for Dropbox datastore
  App.datastore = new Ember.RSVP.Promise(function (resolve, reject) {
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
      return App.datastore.then(function(datastore) {
        return new Ember.RSVP.Promise(function (resolve, reject) {
          var table = datastore.getTable('items');
          var values = $.map(table.query(), function (record) {
            return $.extend(record.getFields(), {"id": record.getId()});
          });
          resolve(values);
        });
      });
    }
  });
  App.ItemRoute = Ember.Route.extend({
    model: function(params) {
      return App.datastore.then(function(datastore) {
        return new Ember.RSVP.Promise(function (resolve, reject) {
          var table = datastore.getTable('items');
          var record = table.get(params.item_id);
          var value = $.extend(record.getFields(), {"id": record.getId()});
          resolve(value);
        });
      });
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
