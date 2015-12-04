/**
 * Copyright 2015 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
*/
/**
 * Licensed Materials - Property of IBM
 * © Copyright IBM Corp. 2015
*/
'use strict';

var Q = require('q');
var Https = require('https');
var Http = require('http');

/**
 * request
 * Execute a HTTPS request to the Kafka REST service.
 *
 * @param requestOptions    The options for the HTTP request which will be fed into https.request(...)
 * @param options           Additional options used when configuring promise resolution patterns.
 *                            Valid option keys:
 *                              - acceptedResponseCodes (Array<Number>): Array of response codes which will trigger
 *                                positive promise resolution.
 *                              - ignoredErrorCodes (Array<Number>): Array of error response code which will be ignoredErrorCodes
 *                                if the status code returned is 400 or higher.
 *
 * @returns Q Promise which will resolve when the HTTPS request completes.
*/
module.exports.request = function(requestOptions, options, body) {
  var deferred = Q.defer();
  var handler;
  options = options || { };

  if(!options.hasOwnProperty('https')) {
    options.https = true;
  }

  // Change acceptedResponseCodes and ignoredErrorCodes into an array if
  // input is in the incorrect form
  var defaults = {
    "acceptedResponseCodes": [200],
    "ignoredErrorCodes": [],
  };

  for(var key in defaults) {
    if(typeof(options[key]) === 'number') {
      options[key] = [options[key]];
    } else if(!Array.isArray(options[key])) {
      options[key] = defaults[key];
    }
  }

  if(options.https) {
    handler = Https;
  } else {
    handler = Http;
  }

  var req = handler.request(requestOptions, function(response) {
    // Stitch the response data together as it arrives.
    var responseData = '';

    response.on('data', function(data) {
      responseData += data;
    });

    // Once all the data has been retrieved, check the response code.
    // If it is in the list of accepted response codes, or is in the error
    // code ignore list, resolve the promise with the data retrieve from
    // the call.
    response.on('end', function() {
      var result;
      var errorCode;
      var errorMessage;

      try {
        result = JSON.parse(responseData);
        errorCode = result.errorCode;
        errorMessage = result.errorMessage;
      } catch(e) {
        result = responseData;
      }
      
      if(options.acceptedResponseCodes.indexOf(response.statusCode) > -1
          || options.ignoredErrorCodes.indexOf(response.statusCode) > -1
          || (options.ignoredErrorCodes.indexOf(errorCode) > -1 && errorCode))
      {
        deferred.resolve(result);
      } else {
        var errorString = 'Request returned status code ' + response.statusCode + ' but it was not in the accepted list. ';

        if(errorMessage) {
          errorString += 'The REST API responded with the following message: ' + errorMessage;
        }

        deferred.reject(new Error(errorString));
      }
    });
  });

  // Write data body if the request is a POST or PUT,
  // before ending the request.
  if(requestOptions.method === 'POST' || requestOptions.method === 'PUT') {
    if(body) {
      req.write(JSON.stringify(body));
    } else {
      deferred.reject(new Error('Provided body parameter must be non-null if the request is a PUT or POST.'));
    }
  }

  req.end();

  req.on('error', function(error) {
    deferred.reject(new Error('Error encountered during request: ' + error.code));
  });

  return deferred.promise;
};
