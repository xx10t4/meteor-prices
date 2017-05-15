SyncedCron.add({
  name: 'Import data from iotaexchange',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 10 seconds');
  },
  job: function() {
    console.log('importing iotaexchange')
    return Meteor.call('trades.importFromIotaExchange');
  }
});

SyncedCron.start();