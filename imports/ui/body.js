import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Trades } from '../model/trades.js';
import './body.html';

const d3 = require("d3");
var refreshRate = 5000; // refresh every 5s


Template.body.onCreated(function bodyOnCreated() {
  this.state = new ReactiveDict();
  this.state['time_range'] = 'all'; // set default time_range
  renderGraphs(this, true);
});

Template.body.events({
  'click .import-files'(event) {
    //Meteor.call('trades.importFromFiles');
  },
  'click .import-exchange'(event) {
    //Meteor.call('trades.importFromIotaExchange');
  },
  'change #time_range'(event) {
    event.preventDefault();
    var template = Template.instance();
    template.state['time_range'] = event.target.value;
    renderGraphs(template);
  }
}); 

var g_orders = undefined;
var g_trades = undefined;

function renderGraphs(template, do_loop = false) {
  renderTrades(template);
  renderOrders(template);
  if(do_loop) {
    setTimeout(function(){
        renderGraphs(template, do_loop);
    }, refreshRate);
  }
}

function renderTrades(template) {

  // filter by time range
  var time_ranges = getDateRanges(template.state['time_range']);
  var json_url = '/api/v1/trades?';
  if(time_ranges[0]) {
      json_url +=  'start=' + time_ranges[0];
  }
  if(time_ranges[1]) {
      json_url += 'end=' + time_ranges[1];
  }
  d3.json(json_url, function(data) {

        data.forEach(function(val){
          // D3 needs the timestamps to be converted to Date, not sure why
          val.timestamp = Date.parse(val.timestamp);
        });

        // Update the latestTrade indo in header
        var latestTrade = data[0];
        $('#latest_price').html( latestTrade.price);
        $('#latest_quantity').html( latestTrade.quantity);
        $('#latest_timestamp').html( moment(latestTrade.timestamp).format('MM/DD/YYYY h:mm:ss a'));
        $('#latest_update').html( moment(Date.now()).format('h:mm:ss a'));

        // Build the graph
        var svg = d3.select("#svg_trades"),
            margin = {top: 20, right: 50, bottom: 30, left: 75},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom;
        var priceHeight = height * (2/3);
        var volumeHeight = priceHeight + 10;

        if(g_trades) g_trades.remove(); // after inital page load, need to remove() on each refresh
        g_trades = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        timeScale = d3.scaleTime().range([0, width]);
        priceScale = d3.scaleLinear().range([priceHeight, 0]);
        volumeScale = d3.scaleLinear().range([height, volumeHeight]);

        priceLine = d3.line()
            .x(function(d) { return timeScale(d.timestamp); })
            .y(function(d) { return priceScale(d.price); });

        volumeLine = d3.line()
            .x(function(d) { return timeScale(d.timestamp); })
            .y(function(d) { return volumeScale(d.quantity); });

        timeScale.domain(d3.extent(data, function(d) { return d.timestamp; }));
        volumeScale.domain([0, d3.max(data, function(d) { return d.quantity; })]);
        // expand the price extent 1 unit beyond the min and max prices to make the graph look nicer
        var price_extent = d3.extent(data, function(d) { return d.price; });
        price_extent[0] = price_extent[0] - 1; 
        price_extent[1] = price_extent[1] + 1; 
        priceScale.domain(price_extent);

        var timeAxis = d3.axisBottom(timeScale);
        timeAxis.ticks(width/100);

        var priceAxis = d3.axisLeft(priceScale); 
        priceAxis.ticks(10);

        var volumeAxis = d3.axisLeft(volumeScale); 
        volumeAxis.ticks(4);

        g_trades.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(timeAxis)
            .select(".domain");

        g_trades.append("g")
            .call(priceAxis)
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Price (microBTC/Miota)");

        g_trades.append("g")
            .call(volumeAxis)
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y",  6)
            .attr("x", 0 - volumeHeight)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Volume (Miota)");

        g_trades.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1)
            .attr("d", priceLine);

       g_trades.selectAll("rect").data(data)
            .enter()
            .append("rect")
            .attr("fill", function(d, i) { return d.type == 'UP' ? 'green':'red'; })
            .attr("x", function(d, i) { return Math.round(timeScale(d.timestamp)); })
            .attr("y", function(d, i) { return Math.round(volumeScale(d.quantity)); })
            .attr("height", function(d, i) { return height - Math.round(volumeScale(d.quantity)); })
            .attr("width", 1);
  });
}

function renderOrders(template) {

    d3.json('http://data.iotaexchange.com/proxy', function(d) {

        var all_orders = d['orders'];
        var data = [];
        all_orders.forEach( function (order) {
            found = false;
            data.filter(function( ag_order ) {
                if(ag_order.price == order.price) {
                     
                    ag_order.qty += order.qty
                    found = true;    
                }
            });
            if(!found){
                data.push(order);
            }
        });

        var svg = d3.select("#svg_orders"),
            margin = {top: 20, right: 50, bottom: 30, left: 75},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom;

        if(g_orders) g_orders.remove(); // after inital page load, need to remove() on each refresh
        g_orders = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        priceScale = d3.scaleLinear().range([0, width]);
        volumeScale = d3.scaleLinear().range([height, 0]);

        volumeScale.domain([0, d3.max(data, function(d) { return d.qty; })]);
        var price_extent = d3.extent(data, function(d) { return d.price; });
        price_extent[0] = price_extent[0] - 1; 
        price_extent[1] = price_extent[1] + 1; 
        priceScale.domain(price_extent);

        var priceAxis = d3.axisBottom(priceScale); 
        priceAxis.ticks((price_extent[1] - price_extent[0])/8);

        var volumeAxis = d3.axisLeft(volumeScale); 
        volumeAxis.ticks(4);

        g_orders.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(priceAxis)
            .append("text")
            .attr("fill", "#000")
            .attr("y", 20)
            .attr("x",  width/2 + 40)
            .attr("dy", "1em")
            .attr("text-anchor", "end")
            .text("Price (microBTC/Miota)");

        g_orders.append("g")
            .call(volumeAxis)
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y",  6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Quantity (Miota)");

       g_orders.selectAll("rect").data(data)
            .enter()
            .append("rect")           
            .attr("fill", function(d, i) { return d.type == 'ASK' ? 'green':'red'; })
            .attr("x", function(d, i) { return Math.round(priceScale(d.price)) - 2; })
            .attr("y", function(d, i) { return Math.round(volumeScale(d.qty)); })
            .attr("height", function(d, i) { return height - Math.round(volumeScale(d.qty)); })
            .attr("width", 4);

        var legend = [{color: 'red',text:"Bid"},{color: 'green',text:"Ask"}];
        var legend_x = width - 50;
        var legend_y =10;
        var legend_dy = 20;
        var legend_size = 10;
        g_orders.selectAll("rect.legend")
            .data(legend)
            .enter()
            .append("rect")           
            .attr("fill",  function(d){ return d.color;})
            .attr("x", function(d,i){ return legend_x ;})
            .attr("y", function(d,i){ return legend_y + (i * legend_dy) ;})
            .attr("height", legend_size)
            .attr("width", legend_size);

        g_orders.selectAll("text.legend")
            .data(legend)
            .enter()
            .append("text")
            .attr("font-family", "sans-serif")
            .attr("fill", "#000")
            .attr("x", legend_x + 2 * legend_size)
            .attr("y", function(d,i){ return legend_y + legend_size + (i * legend_dy) ;})
            .text( function(d){ return d.text;});

    });
}

function getDateRanges(time_range){
    var start_time = null;
    var end_time = null;
    switch(time_range) {
        case "3_month":
            start_time = moment().subtract(3, 'months').valueOf();
            break;
        case "1_month":
            start_time = moment().subtract(1, 'months').valueOf();
            break;
        case "1_week":
            start_time = moment().subtract(1, 'weeks').valueOf();
            break;
        case "1_day":
            start_time = moment().subtract(1, 'days').valueOf();
            break;
        default:       
    }
    return [start_time, end_time];
}