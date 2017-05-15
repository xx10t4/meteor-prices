import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';

export const Trades = new Mongo.Collection('trades');

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish trades that are public or belong to the current user
  Meteor.publish('trades', function tradesPublication() {
    // Trades.remove({});
    return Trades.find({},{sort: {timestamp: -1}, limit: 1000});
  });
}

Meteor.methods({
  'trades.insert'(date, price, quantity, type) {
    check(price, Number);
    check(quantity, Number);
    check(date, Date);
    check(type, String);

    // Make sure the user is logged in before inserting a trade
    if (! this.userId) {
      //throw new Meteor.Error('not-authorized');
    }
    console.log(date + " | " + price + " | " + quantity + " | " + type);
    return;

    Trades.update({
      timestamp: date,
      price: price,
      quantity: quantity,
      type: type,
    },
    { $set: {
      timestamp: date,
      price: price,
      quantity: quantity,
      type: type,
    }
    },
    {
      upsert: true
    });
  },
  'trades.importFromFiles'() {
    if(Meteor.isServer){
      fs = require('fs');
      const path = "/home/daemmon/projects/iota/github/simple-todos/trades_data/";      
      var files = fs.readdirSync(path);     
      if(files) {
        for (var i=0; i<files.length; i++) {
          var fileName = files[i];
          var data = fs.readFileSync(path + fileName, 'utf8');
          if(data){
            parseTrades(data).forEach(function(trade){
              saveTrade(trade);
            });
          }
        }                      
      }
    }    
  },
  /*'trades.remove'(tradeId) {
    check(tradeId, String);

    const trade = Trades.findOne(tradeId);
    if (trade.private && trade.owner !== this.userId) {
      // If the trade is private, make sure only the owner can delete it
      throw new Meteor.Error('not-authorized');
    }

    Trades.remove(tradeId);
  },*/
  'trades.importFromIotaExchange'() {
    var url = "http://data.iotaexchange.com/proxy";
    //synchronous GET
    var result = HTTP.get(url, {timeout:10000});
    if(result.statusCode==200) {
      var json = JSON.parse(result.content);
      json['trades'].forEach(function(trade){
        trade['quantity'] = trade['qty'];
        saveTrade(trade);
      });
    } else {
      console.log("Response issue: ", result.statusCode);
      var errorJson = JSON.parse(result.content);
      throw new Meteor.Error(result.statusCode, errorJson.error);
    }
  }
 });


function saveTrade(trade) {
  console.log(trade);
  var date = new Date(trade['timestamp']);
  var price = parseInt(trade['price']);
  var quantity = parseInt(trade['quantity']);
  var type = trade['type'];

  check(price, Number);
  check(quantity, Number);
  check(date, Date);
  check(type, String);

  Trades.update({
      timestamp: date,
      price: price,
      quantity: quantity,
      type: type,
    },
    { $set: {
      timestamp: date,
      price: price,
      quantity: quantity,
      type: type,
    }
    },
    {
      upsert: true
  });
}


function testImportFiles() {
    fs = require('fs');
    const path = "/home/daemmon/projects/iota/github/simple-todos/trades_data/";
    
    fs.readdir(path, function(err, items) {
        if(items) {
            storage = {};
            for (var i=0; i<items.length; i++) {
                var fileName = items[i];
                var data = fs.readFileSync(path + fileName, 'utf8');
                if(data){
                    fileName = fileName.replace(/[\(\)]/g, '')
                    storage[fileName] = parseTrades(data);
                }
            }
            // Checks to see if all files being imported form a contiguous set of trades based on timestamp
            for(var fileName in storage){
                console.log(fileName);
                var trades = storage[fileName];
                first = trades[0];
                last = trades[trades.length - 1];
                found_first = false;
                found_last = false;

                for(var otherFile in storage) {

                    var otherTrades = storage[otherFile];
                    if(otherFile != fileName){
                        for(var i=0 ; i < otherTrades.length ; i++ ){
                            if(otherTrades[i]['key'] == first['key']){
                                found_first = true;
                            }
                            if(otherTrades[i]['key'] == last['key']){
                                found_last = true;
                            }
                        }
                    }
                }
                if(!found_first){
                    console.log("first in " + fileName +  " not found:" + first + " " + new Date(parseInt(first[0])));
                }
                if(!found_last){
                    console.log("last in " + fileName +  " not found:" + last + " " + new Date(parseInt(last[0])));
                }
            }                      
        }
    });
}

// Parses a Trades file from ydx.slack.com into a json array of trades
function parseTrades(fileContent) {
    var trades = [];
    if(fileContent) {
        var lines = fileContent.split("\n");       
        for(var i = 2; i < lines.length ; i++){
            var trade = lines[i].split('|');
            if(trade.length != 5) {
                console.log("unexpected trade format, ignoring record");
                console.log(trade);
                continue;
            }
            trade = sanitizeData(trade);
            trades.push(trade);
        }
    }
    return trades;  
 }

function sanitizeData(trade) {
    var timestamp = new Date(trade[0].replace(/\s+$/g, '') + " UTC+0200").getTime();
    var type = trade[1].replace(/\s/g, '').toUpperCase();
    var quantity = trade[2].replace(/[^0-9]+/g, '');
    var price = trade[3].replace(/[^0-9]+/g, '');
    return {timestamp: timestamp, price: price, quantity: quantity, type: type};
}