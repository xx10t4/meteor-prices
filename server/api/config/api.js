// from https://themeteorchef.com/tutorials/writing-an-api#!

import { Trades } from '../../../imports/model/trades.js';

API = {
  // Handle the request
  handleRequest: function( context, resource, method ) {
    var connection = API.connection( context.request );
    if ( !connection.error ) {
      API.methods[ resource ][ method ]( context, connection );
    } else {
      API.utility.response( context, 401, connection );
    }
  },

  // Authenticate connection
  connection: function( request ) {
    var getRequestContents = API.utility.getRequestContents( request ),
        apiKey             = getRequestContents.api_key,
        validUser          = API.authentication( apiKey );

    if ( validUser ) {
      delete getRequestContents.api_key;
      return { owner: validUser, data: getRequestContents };
    } else {
      return { error: 401, message: "Invalid API key." };
    }
  },

  // Authenticate API key
  authentication: function( apiKey ) {
    /*var getUser = APIKeys.findOne( { "key": apiKey }, { fields: { "owner": 1 } } );
    if ( getUser ) {
      return getUser.owner;
    } else {
      return false;
    }*/
    return 1; // allow anonymous access for now
  },

  methods: {
    trades: {
      GET: function( context, connection ) {
        var start_time = connection.data.start;
        var end_time = connection.data.end;

        // Mogodb find() params
        filters = {};
        // filter date ranges
        if(start_time || end_time){
          filters.timestamp = {};
          if(start_time){
            filters.timestamp['$gte'] = new Date(Number(start_time));  
          }
          if(end_time){
            filters.timestamp['$lt'] = new Date(Number(end_time));  
          } 
        }       
        var limit = 20000;
        return  API.utility.response(context, 200, Trades.find(filters,{sort: {timestamp: -1}, limit: limit}).fetch());

      }
    }
  },

  resources: {},

  utility: {

    // extract content from request
    getRequestContents: function( request ) {
      switch( request.method ) {
        case "GET":
          return request.query;
        case "POST":
        case "PUT":
        case "DELETE":
          return request.body;
      }
    },

    hasData: function( data ) {},

    // send response
    response: function( context, statusCode, data ) {
      context.response.setHeader( 'Content-Type', 'application/json' );
      context.response.statusCode = statusCode;
      context.response.end( JSON.stringify( data ) );
    },

    validate: function( data, pattern ) {}
  }
};
