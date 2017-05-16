import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Trades } from '../model/trades.js';
import './body.html';

const d3 = require("d3");
Template.body.onCreated(function bodyOnCreated() {
  this.state = new ReactiveDict();
  Meteor.subscribe('trades');
  renderTrades();
});

Template.body.helpers({
  trades() {
    const instance = Template.instance();
    return Trades.find({}, { sort: { createdAt: -1 } });
  }
 });

Template.body.events({
  'click .import-files'(event) {
    //Meteor.call('trades.importFromFiles');
  },
  'click .import-exchange'(event) {
    //Meteor.call('trades.importFromIotaExchange');
  }
});

var refreshRate = 5000; // refresh every 5s
var g = undefined;

function renderTrades() {

  Meteor.call('trades.importFromIotaExchange');

  d3.json('/api/v1/trades', function(data) {

        data.forEach(function(val){
          // D3 needs the timestamps to be converted to Date, not sure why
          val.timestamp = Date.parse(val.timestamp);
        });

        // Update the latestTrade indo in header
        var latestTrade = data[0];
        $('#latest_price').html( latestTrade.price);
        $('#latest_quantity').html( latestTrade.quantity);
        $('#latest_timestamp').html( moment(latestTrade.timestamp).format('MMM Do YYYY, h:mm:ss a'));

        // Build the graph
        var svg = d3.select("svg"),
            margin = {top: 40, right: 50, bottom: 30, left: 75},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom;
        var priceHeight = height * (2/3);
        var volumeHeight = priceHeight + 10;
        console.log("width:"+svg.attr("width"));

        if(g) g.remove(); // after inital page load, need to remove() on each refresh
        g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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

        g.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(timeAxis)
            .select(".domain");

        g.append("g")
            .call(priceAxis)
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Price (microBTC/Miota)");

        g.append("g")
            .call(volumeAxis)
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y",  6)
            .attr("x", 0 - volumeHeight)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Volume (Miota)");

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1)
            .attr("d", priceLine);

       g.selectAll("rect").data(data)
            .enter()
            .append("rect")
            .attr("fill", function(d, i) { return d.type == 'UP' ? 'green':'red'; })
            .attr("x", function(d, i) { return Math.round(timeScale(d.timestamp)); })
            .attr("y", function(d, i) { return Math.round(volumeScale(d.quantity)); })
            .attr("height", function(d, i) { return height - Math.round(volumeScale(d.quantity)); })
            .attr("width", 1);
  });

  setTimeout(renderTrades, refreshRate);
}

