(function() {
  // http://stackoverflow.com/a/7616484/338986
  function hashCode(str) {
    var hash = 0, i, char;
    if (str.length == 0) return hash;
    for (i = 0, l = str.length; i < l; i++) {
        hash  = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    console.log(hash);
    return hash;
  }
  function labelKey(label) {
    return "label_" + Number(hashCode(label)).toString(36);
  }
  // Ember.js Application
  window.App = Ember.Application.create({
    //LOG_TRANSITIONS: true, 
    //LOG_TRANSITIONS_INTERNAL: true
  });
  // The dropbox datastore adapter
  App.ApplicationAdapter = DropboxDataStoreAdapter("qidrlfs46ow3v25", App);
  // Item
  App.Item = DropboxDataStoreAdapter.Model.extend({
    title: DS.attr(),
    pos: DS.attr(),
    autoSave: function() {
      this.save();
    }.observes("title"),
    // labels
    labels: function() {
      var labels = Ember.A();
      var noAttrs = this.get('noAttrs');
      for (var key in noAttrs) {
        if (key.match(/^label_(.*)$/)) {
          labels.addObject(noAttrs[key]);
        }
      }
      return labels;
    }.property("noAttrs.@each"),
    labelsChanged: function() {
      var labels = this.get('labels');
      var noAttrs = this.get('noAttrs');
      // First, clear label fields
      for (var key in noAttrs) {
        if (key.match(/^label_(.*)$/)) {
          noAttrs[key] = null;
        }
      }
      // Keep only current labels
      labels.forEach(function(label) {
        noAttrs[labelKey(label)] = label;
      });
      this.save();
    }.observes("labels.@each")
  });
  App.Item.reopenClass({
    dbQuery: function(inQuery) {
      var outQuery = {};
      if (inQuery['labels']) {
        inQuery['labels'].forEach(function(label) {
          var key = "label_" + btoa(unescape(encodeURIComponent(label)));
          outQuery[key] = label;
        });
      }
      return outQuery;
    }
  });
  // Laebel
  // App.Label = DropboxDataStoreAdapter.Model.extend({
  //   name: DS.attr(),
  // });
  // App.Label.reopenClass({
  //   tableName: "labels", // FIXME: table name should be converted as plulalization of the model name
  // });


  // -> router.js
  App.Router.reopen({
    //location: 'history'
  }); 
  App.Router.map(function() {
    this.resource('items', { path: '/items', queryParams: ['labels'] }, function() {
      this.resource('item', { path: ':item_id', queryParams: ['labels'] });
    });
  });
  App.ApplicationRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      controller.set('labels', Ember.A(["foo", "bar"]));
    }
  });
  // Index -> Items
  App.IndexRoute = Ember.Route.extend({
    redirect: function() {
      this.transitionTo('items');
    }
  });
  // Items
  App.ItemsRoute = Ember.Route.extend({
    model: function(params, queryParams) {
      var labels = queryParams['labels'] ? queryParams['labels'].split(',') : [];
      return this.get('store').filter('item', {"labels": labels}, function(item) {
        return labels.every(function(label) {
          return item.get('labels').contains(label);
        });
      });
    },
    actions: {
      createItem: function() {
        var record = this.get('store').createRecord('item', {
          title: "new item",
          pos: Date.now()
        });
        this.transitionTo("item", record);
        //record.save();
        // this.transitionTo(record);
        // datastore.then(function(datastore) {
        //   datastore
        // });
      }
    }
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
    actions: {
      deleteItem: function(item) {
        if (confirm("Are you sure?")) {
          item.deleteRecord();
          item.save();
        }
      }
    }
  });
  App.ItemController = Ember.ObjectController.extend({
    actions: {
      addLabel: function() {
        var label = this.get("newLabel").trim();
        var item = this.get("model");
        item.get("labels").addObject(label);
        item.save();
        this.set("newLabel", "");
      },
      deleteLabel: function(label) {
        var item = this.get("model");
        var labels = item.get("labels");
        labels.removeObject(label.toString());
        item.save();
      }
    }
  });
})();
