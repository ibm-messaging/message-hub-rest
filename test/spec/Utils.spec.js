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

var Utils = require('../../lib/utils');
var Expect = require('expect.js');
var Url = require('url');

module.exports.run = function(services, port, useMockService) {
  var requestOptions;
  var message;

  beforeEach('Set request options and sample message', function() {
    // Set request options which do not change, regardless of whether
    // or not a real Kafka REST service is being used.
    requestOptions = {
      path: '/admin/topics',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };

    // Set host and headers options depending on whether
    // or not a real service is being used.
    if(useMockService) {
      requestOptions.host = 'localhost';
      requestOptions.port = port;
      requestOptions.headers['X-Auth-Token'] = 'an_api_key';
    } else {
      var url = Url.parse(services["messagehub"][0].credentials.kafka_rest_url);
      requestOptions.host = url.hostname;
      requestOptions.port = url.port;
      requestOptions.headers['X-Auth-Token'] = services["messagehub"][0].credentials.api_key;
    }

    message = { 'records': [{ 'value': new Buffer('Test string').toString('base64') }] };
  });

  describe('[Utils.request]', function() {

    it('Returns a promise object', function() {
      Expect(Utils.request(requestOptions, { }, message).constructor.name).to.eql('Promise');
    });

    it('Resolves promise when a request is successful', function(done) {
      Utils.request(requestOptions, { https: !useMockService }, message)
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an('object');
          done();
        })
        .fail(function(error) {
          Expect().fail('Request should have been successful: ' + error.message);
        });
    });

    it('Rejects return codes which are not in the accepted list', function(done) {
      Utils.request(requestOptions, { acceptedResponseCodes: [], https: !useMockService }, message)
        .then(function(response) {
          done(new Error('Request should have failed: ' + response));
        })
        .fail(function(error) {
          Expect(error).to.not.be(null);
          Expect(error).to.be.an(Error);
          done();
        });
    });

    it('Ignores error codes which are in the ignore list', function(done) {
      requestOptions.path = '/a/404/page';

      Utils.request(requestOptions, { ignoredErrorCodes: [404], https: !useMockService }, message)
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an('object');
          done();
        })
        .fail(function(error) {
          done(new Error('Request should have been successful: ' + error.message));
        });
    });

    it('Rejects promise when status code is over 400 and not in the ignore list', function(done) {
      requestOptions.path = '/a/404/page';

      Utils.request(requestOptions, { https: !useMockService }, message)
        .then(function(response) {
          done(new Error('Request should have been successful: ' + error.message));
        })
        .fail(function(error) {
          Expect(error).not.to.be(null);
          done();
        });
    });

    it('Rejects promise when request is POST/PUT, but the body parameter is invalid', function(done) {
      var methods = ['POST', 'PUT'];
      var receivedResponses = 0;

      for(var index in methods) {
        requestOptions.method = methods[index];

        Utils.request(requestOptions, { https: !useMockService })
          .then(function(response) {
            done(new Error('Request should have failed: ' + JSON.stringify(response)));
          })
          .fail(function(error) {
            Expect(error).not.to.be(null);
            Expect(error).to.be.an(Error);

            receivedResponses++;

            if(receivedResponses === methods.length) {
              done();
            }
          });
      }
    });
  });

};
