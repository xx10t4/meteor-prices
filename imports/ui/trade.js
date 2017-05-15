import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './trade.html';

Template.trade.helpers({
});

Template.trade.events({
  'click .toggle-checked'() {
    // Set the checked property to the opposite of its current value
    Meteor.call('trades.setChecked', this._id, !this.checked);
  },
  'click .delete'() {
    Meteor.call('trades.remove', this._id);
  },
  'click .toggle-private'() {
    Meteor.call('trades.setPrivate', this._id, !this.private);
  },
});
