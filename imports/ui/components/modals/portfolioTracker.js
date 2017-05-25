
import { Session } from 'meteor/session';
import './portfolioTracker.html';

// TODO figure out how to not need these ddefined in 2 places (see body.js)
var miotaAmountKey = 'miotaAmount';
var currencyKey = 'currency';
var bitcoinRateKey = 'bitcoinRate';


Template.portfolioTracker.onCreated(function bodyOnCreated() {

});


Template.portfolioTracker.events({
  'click #portfolioTrackerClose'(event, template) {
	event.preventDefault();
	var iotaAmount = $('#iota_amount_input').val() || 0;
	var currency = $('#currency_input').val() || "";
    Session.set(miotaAmountKey, iotaAmount);
	Session.set(currencyKey, currency);
	if(iotaAmount > 0 && currency != "") {
	  getBitcoinPrice();
	  $('#iota_value').html('getting price...');
	} else {
      $('#iota_value').html('');
    }
  },
  'shown.bs.modal .modal'(event, template) {
	$('#iota_amount_input').val(Session.get(miotaAmountKey));
	$('#currency_input').val(Session.get(currencyKey));
  }
}); 


function getBitcoinPrice() {
	
	var miotaAmount = Session.get(miotaAmountKey);
	var currency = Session.get(currencyKey);

	if( miotaAmount > 0 && currency != "") {
      var url = "http://api.coindesk.com/v1/bpi/currentprice/"+currency+".json";
	  console.log("getBitcoinPrice url:"+url);
      //asynchronous GET
      HTTP.get(url, {timeout:20000}, function(error, result){
		if(result && result.statusCode==200) {
			var json = JSON.parse(result.content);
			Session.set(bitcoinRateKey, json['bpi'][currency]['rate_float']);
		} else {
			console.log("Response issue: ", error);			
		}
		setTimeout(getBitcoinPrice, 60000);
	  });
	} 
}
