import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

import { Trades } from '../model/trades.js';

import './trade.js';
import './body.html';

Template.body.onCreated(function bodyOnCreated() {
  this.state = new ReactiveDict();
  Meteor.subscribe('trades');
});

Template.body.helpers({
  trades() {
    const instance = Template.instance();
    if (instance.state.get('hideCompleted')) {
      // If hide completed is checked, filter trades
      return Trades.find({ checked: { $ne: true } }, { sort: { createdAt: -1 } });
    }
    // Otherwise, return all of the trades
    return Trades.find({}, { sort: { createdAt: -1 } });
  },
  incompleteCount() {
    return Trades.find({ checked: { $ne: true } }).count();
  },
});

Template.body.events({
  'submit .new-trade'(event) {
    // Prevent default browser form submit
    event.preventDefault();

    // Get value from form element
    const target = event.target;
    const text = target.text.value;

    // Insert a trade into the collection
    Meteor.call('trades.insert', text);

    // Clear form
    target.text.value = '';
  },
  'change .hide-completed input'(event, instance) {
    instance.state.set('hideCompleted', event.target.checked);
  },
  'click .import-files'(event) {
    Meteor.call('trades.importFromFiles');
  },
  'click .import-exchange'(event) {
    Meteor.call('trades.importFromIotaExchange');
  }
});
