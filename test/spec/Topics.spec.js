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
var TestUtils = require('../test-utils');
var Expect = require('expect.js');
var Q = require('q');

module.exports.run = function(services, port, useMockService) {

  describe('[Client.prototype.topics] API', function() {
    var TOPIC_PREFIX = TestUtils.generateID();
    var instance;

    console.log(TOPIC_PREFIX);

    // Create a Message Hub client instance before each test. We're not
    // testing client instantiation here so a default one is fine for
    // each test.
    beforeEach('Create a new instance of Message Hub client', function() {
      instance = new MessageHub(services, { 'https': !useMockService });
    });

    it('Exposes topics object', function() {
      Expect(instance.hasOwnProperty('topics'));
    });

    it('prototype.topics.create', function(done) {
      var topicName = TOPIC_PREFIX + 'mytopic';
      var promise = instance.topics.create();

      promise.then(function(response) {
        return instance.topics.delete(topicName);
      })
      .fin(function() {
        done();
      });

      Expect(instance.topics.hasOwnProperty('create'));
      Expect(promise.constructor.name).to.eql('Promise');
    });

    it('prototype.topics.delete', function() {
      Expect(instance.topics.hasOwnProperty('delete'));
      Expect(instance.topics.delete(TOPIC_PREFIX + 'mytopic').constructor.name).to.eql('Promise');
    });

    it('prototype.topics.get', function() {
      Expect(instance.topics.hasOwnProperty('get'));
      Expect(instance.topics.get().constructor.name).to.eql('Promise');
    });

  });

  describe('[Client.prototype.topics] Functionality', function() {
    var TOPIC_PREFIX = TestUtils.generateID();
    var instance;
    // Used for internal tracking of topic names.
    // (For comparison to Kafka backend).
    var topicList = [];

    // Create a Message Hub client instance before each test. We're not
    // testing client instantiation here so a default one is fine for
    // each test.
    beforeEach('Create a new instance of Message Hub client', function() {
      instance = new MessageHub(services, { 'https': !useMockService });
    });

    it('Creates a topic successfully', function(done) {
      var input = TOPIC_PREFIX + 'mytopic';

      topicList.push(input);

      instance.topics.create(input)
        .then(function(data) {
          return instance.topics.delete(input);
        })
        .then(function(response) {
          done();
        })
        .catch(function(error) {
          done(new Error('Topic creation should have succeeded: ' + error.message));
        });
    });

    it('Rejects promise instantly when creating a topic with invalid inputs', function(done) {
      var input = [undefined, null, '', 7.3, {}, []];
      var expected = [ReferenceError, ReferenceError, Error, TypeError, TypeError, TypeError];
      var promisesResolved = 0;

      for(var index in input) {
        (function() {

          var i = index;

          instance.topics.create(input[i])
            .then(function(data) {
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

    it('Deletes a topic successfully', function(done) {
      var input = TOPIC_PREFIX + 'delete_test_topic';
      var timeout = 2000;

      // First, create a topic to be deleted.
      instance.topics.create(input)
        .then(function(response) {
          // Wait <timeout> seconds for the topic to be inserted
          // into the server-side topic list.
          return Q.delay(instance.topics.get(), timeout);
        })
        .then(function(response) {
          var inList = false;
          var index = 0;
          // Search for the topic, if it is not in the list
          // the test fails.
          while(index < response.length && !inList) {
            if(response[index].name === input) {
              inList = true;
            }

            index++;
          }

          if(!inList) {
            done(new Error('Topic ' + input + ' not in list after ' + timeout + ' milliseconds.'));
          }

          // If the topic is in the list, delete it
          // and wait for a response.
          return instance.topics.delete(input);
        })
        .then(function(response) {
          done();
        })
        .fail(function(error) {
          done(new Error('Topic should have been deleted but received error: ' + error.message));
        });
    });

    it.skip('Gets a 404 when attempting to delete a topic which doesn\'t exist', function(done) {
      var input = 'abcdef';

      instance.topics.delete(input)
        .then(function(data) {
          done(new Error('Promise for value "' + input + '" should have been rejected.'));
        })
        .fail(function(error) {
          Expect(error).not.to.be(null);
          done();
        })
    });

    it('Rejects promise instantly when deleting a topic using invalid inputs', function(done) {
      var input = [undefined, null, '', 7.3, {}, []];
      var expected = [ReferenceError, ReferenceError, Error, TypeError, TypeError, TypeError];
      var promisesResolved = 0;

      for(var index in input) {
        (function() {

          var i = index;

          instance.topics.delete(input[i])
            .then(function(data) {
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

    it('Successfully retrieves a list of topics', function(done) {
      var topicName = TOPIC_PREFIX + 'topic_to_create';
      instance.topics.create(topicName)
        .then(function(response) {
          return Q.delay(response, 1000);
        })
        .then(function(data) {
          return instance.topics.get();
        })
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an(Array);
          Expect(response.length).to.be.greaterThan(0);
        })
        .then(function() {
          instance.topics.delete(topicName);
        })
        .fin(function() {
          done();
        });
    });

  });

};
