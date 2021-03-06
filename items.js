(function() {
  // http://stackoverflow.com/a/7616484/338986
  function hashCode(str) {
    var hash = 0, i, char;
    if (str.length == 0) return hash;
    for (i = 0, l = str.length; i < l; i++) {
      hash  = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash >>> 0; // http://stackoverflow.com/a/17106974/338986
  }
  function labelKey(label) {
    return "label_" + hashCode(label).toString(36);
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
    text: DS.attr('string', {defaultValue:''}),
    pos: DS.attr(),
    head: function() {
      return this.get('text').match(/.*/)[0];
    }.property('text'),
    autoSave: function() {
      if (this.id) {
        this.save();
      }
    }.observes("text"),
    _moveToModel: function(typeName) {
      var store = this.get('store');
      // TODO: atomic operation
      var record = store.createRecord(typeName, this.toJSON());
      record.save();
      this.deleteRecord();
      this.save();
    },
    archive: function() {
      this._moveToModel('archive');
      // var store = this.get('store');
      // // TODO: atomic operation
      // var record = store.createRecord('archive', this.toJSON());
      // record.save();
      // this.deleteRecord();
      // this.save();
    },
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
      if (labels) {
        labels.forEach(function(label) {
          noAttrs[labelKey(label)] = label;
          var store = this.get('store');
          // create new label
          store.find('label', {name: label}).then(function(exists) {
            if (exists.get('length') == 0) {
              var labelRecord = store.createRecord('label', {name: label});
              labelRecord.save();
            }
          });
        }.bind(this));
      }
      //this.save();
    }.observes("labels.@each")
  });
  App.Item.reopenClass({
    dbQuery: function(inQuery) {
      var outQuery = {};
      if (inQuery['labels']) {
        inQuery['labels'].forEach(function(label) {
          outQuery[labelKey(label)] = label;
        });
      }
      return outQuery;
    }
  });
  // Laebel
  App.Label = DropboxDataStoreAdapter.Model.extend({
    name: DS.attr()
  });
  // Archive
  App.Archive = App.Item.extend({
    isArchive: true,
    unarchive: function() {
      this._moveToModel('item');
      // var store = this.get('store');
      // // TODO: atomic operation
      // var record = store.createRecord('item', this.toJSON());
      // record.save();
      // this.deleteRecord();
      // this.save();
    },
  });
  // App.Tag = DS.Model.extend({
  //   name: DS.attr()
  // });

  // App.Label.reopenClass({
  //   tableName: "labels", // FIXME: table name should be converted as plulalization of the model name
  // });


  // -> router.js
  App.Router.reopen({
    //location: 'history'
  }); 
  App.Router.map(function() {
    this.resource('items', { path: '/items' }, function() {
      this.resource('item', { path: ':item_id' });
    });
  });
  App.ApplicationRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      //controller.set('labels', Ember.A(["foo", "bar"]));
      controller.set('labels', this.get('store').find('label'));
    },
    actions: {
      deleteLabel: function(label) {
        label.deleteRecord();
        label.save();
      }
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
    setupController: function(controller, model) {
      controller.set('model', model);
      controller.set('labels', this.get('labels'));
    },
    model: function(params) {
      var store = this.get('store');
      if (params['archive']) {
        return store.findAll('archive');
      } else {
        var labels = params['labels'] ? params['labels'].split(',') : [];
        this.set('labels', params['labels']);
        return store.filter('item', {"labels": labels}, function(item) {
          return labels.every(function(label) {
            return item.get('labels').contains(label);
          });
        });
      }
    },
    actions: {
      queryParamsDidChange: function () {
        this.refresh();
      },
      createItem: function(labels) {
        var record = this.get('store').createRecord('item', {
          text: "new item",
          pos: Date.now() / 1000,
          labels: labels
        });
        record.save();
        this.transitionTo("item", record);
      },
      archiveItem: function(item) {
        item.archive();
      },
      unarchiveItem: function(item) {
        item.unarchive();
      },
      deleteItem: function(item) {
        if (confirm("Are you sure?")) {
          item.deleteRecord();
          item.save();
        }
      }
    }
  });
  App.ItemsController = Ember.ArrayController.extend({
    queryParams: ['labels', 'archive'],
    sortProperties: ['pos'],
    sortAscending: false,
  });
  // Item
  App.ItemRoute = Ember.Route.extend({
    model: function(params) {
      return this.get('store').find('item', params.item_id);
    },
    actions: {
    }
  });
  App.ItemController = Ember.ObjectController.extend({
    queryParams: ['labels', 'archive'],
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
