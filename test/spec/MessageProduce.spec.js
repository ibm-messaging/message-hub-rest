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

var MessageHub = require('../../lib/messagehub');
var Expect = require('expect.js');

module.exports.run = function(services, port, useMockService) {

  describe('[Client.prototype.produce] Functionality', function() {
    var instance;

    // Create a Message Hub client instance before each test. We're not
    // testing client instantiation here so a default one is fine for
    // each test.
    beforeEach('Create a new instance of Message Hub client', function() {
      instance = new MessageHub(services, { 'https': !useMockService });
    });

    it('Successfully produces data with raw JavaScript object', function(done) {
      var message = {
        'records': [{ 'value': new Buffer('Test string').toString('base64') }]
      };

      instance.produce('mytopic', message)
        .then(function(response) {
          Expect(response).not.to.be(undefined);
          Expect(response).to.be.an('object');
          Expect(response.key_schema_id).to.be(null);
          Expect(response.value_schema_id).to.be(null);
          // Check offsets response object
          Expect(response.offsets).not.to.be(null);
          Expect(response.offsets).to.be.an(Array);
          Expect(response.offsets.length).to.eql(message.records.length);
          done();
        })
        .fail(function(response) {
          done(new Error(response));
        });
    });

    it('Successfully produces data with MessageList object', function(done) {
      var list = new MessageHub.MessageList()
        .push('Test string');

      instance.produce('mytopic', list.messages)
        .then(function(response) {
          Expect(response).not.to.be(undefined);
          Expect(response).to.be.an('object');
          Expect(response.key_schema_id).to.be(null);
          Expect(response.value_schema_id).to.be(null);
          // Check offsets response object
          Expect(response.offsets).not.to.be(null);
          Expect(response.offsets).to.be.an(Array);
          Expect(response.offsets.length).to.eql(list.messages.records.length);
          done();
        })
        .fail(function(response) {
          done(new Error(response));
        });
    });

    it('Successfully produces data with MessageList object and non-Latin characters', function(done) {
      var list = new MessageHub.MessageList()
        .push('朱朴');

      instance.produce('mytopic', list.messages)
        .then(function(response) {
          Expect(response).not.to.be(undefined);
          Expect(response).to.be.an('object');
          Expect(response.key_schema_id).to.be(null);
          Expect(response.value_schema_id).to.be(null);
          // Check offsets response object
          Expect(response.offsets).not.to.be(null);
          Expect(response.offsets).to.be.an(Array);
          Expect(response.offsets.length).to.eql(list.messages.records.length);
          done();
        })
        .fail(function(response) {
          done(new Error(response));
        });
    });

    it('Rejects promise instantly if message is undefined or null', function(done) {
      var testValues = [undefined, null];
      var promisesResolved = 0;

      for(var i in testValues) {
        instance.produce('mytopic', testValues[i])
          .then(function() {
            done(new Error('Promise for value "' + testValues[i] + '"was not rejected.'));
          })
          .fail(function(error) {
            Expect(error).to.be.a(ReferenceError);
            promisesResolved++;

            if(promisesResolved == testValues.length) {
              done();
            }
          });
      }
    });

    it('Rejects promise instantly when input topic name is invalid', function(done) {
      var input = [2, { an: 'object' }, null, undefined, ''];
      var expected = [TypeError, TypeError, TypeError, TypeError, Error];
      var promisesResolved = 0;

      var message = {
        'records': [{ 'value': new Buffer('Test string').toString('base64') }]
      };

      for(var index in input) {
        (function() {

          var i = index;

          instance.produce(input[i], message)
            .then(function() {
              done(new Error('Promise for value "' + input[i] + '"was not rejected.'));
            })
            .fail(function(error) {
              Expect(error).to.be.a(expected[i]);
              promisesResolved++;

              if(promisesResolved === input.length) {
                done();
              }
            });

        })();
      }
    });

  });

}
