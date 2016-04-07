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

var CONSUMER_GROUP_NAME = 'test_consumer_group';
var CONSUMER_INSTANCE_NAME = 'test_consumer_instance';
var CONSUMER_OPTIONS = { 'auto.offset.reset': 'largest' };
var TOPIC_NAME = 'anothertopic';
var MESSAGE_DATA = 'Test string朱朴';

module.exports.run = function(services, port, useMockService) {

  describe('[Client.prototype.consume] Functionality', function() {
    var instance;

    // Create a Message Hub client instance before each test. We're not
    // testing client instantiation here so a default one is fine for
    // each test.
    beforeEach('Create a new instance of Message Hub client', function(done) {
      instance = new MessageHub(services, { 'https': !useMockService });
      instance.topics.create(TOPIC_NAME)
        .then(function(response) {
          done();
        })
        .fail(function(error) {
          done(new Error('Topic should have been created: ' + error));
        });
    });

    afterEach('Remove consumer instance', function(done) {
      for(var index in instance.consumerInstances) {
        instance.consumerInstances[index].remove();
      }

      instance.topics.delete(TOPIC_NAME)
        .then(function(response) {
          done();
        })
        .fail(function(error) {
          done(new Error('Topic should have been deleted: ' + error));
        })
    });

    it('Successfully creates consumer group and consumer instance', function(done) {
      instance.consume(CONSUMER_GROUP_NAME, CONSUMER_INSTANCE_NAME, CONSUMER_OPTIONS)
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an(Array);
          Expect(response.length).to.eql(2);
          Expect(response[0]).not.to.be(null);
          Expect(response[0]).to.be.a(MessageHub.ConsumerInstance);
          done();
        })
        .fail(function(error) {
          done(new Error('Consumer group and instance should have been created correctly: ' + error.message));
        });
    });

    it('Rejects promise instantly when group name is invalid', function(done) {
      var input = [undefined, null, 2, { test: 'object' }];
      var expected = [ReferenceError, ReferenceError, TypeError, TypeError];
      var resolvedPromises = 0;

      for(var index in input) {
        // Wrap in a closure to preserve index during promise
        (function() {

          var i = index;

          instance.consume(input[i], CONSUMER_INSTANCE_NAME, CONSUMER_OPTIONS)
            .then(function(response) {
              done(new Error('Promise with input "' + input[i] + '" should have been rejected: ' + response));
            })
            .fail(function(error) {
              Expect(error).not.to.be(null);
              Expect(error).to.be.a(expected[i]);
              resolvedPromises++;

              if(resolvedPromises === input.length) {
                done();
              }
            });

        })();
      }
    });

    it('Rejects promise instantly when instance name is invalid', function(done) {
      var input = [undefined, null, 2, { test: 'object' }];
      var expected = [ReferenceError, ReferenceError, TypeError, TypeError];
      var resolvedPromises = 0;

      for(var index in input) {
        // Wrap in a closure to preserve index during promise
        (function() {

          var i = index;

          instance.consume(CONSUMER_GROUP_NAME, input[i], CONSUMER_OPTIONS)
            .then(function(response) {
              done(new Error('Promise with input "' + input[i] + '" should have been rejected: ' + response));
            })
            .fail(function(error) {
              Expect(error).not.to.be(null);
              Expect(error).to.be.a(expected[i]);
              resolvedPromises++;

              if(resolvedPromises === input.length) {
                done();
              }
            });

        })();
      }
    });

  });

  describe('[Client.ConsumerInstance] API', function() {
    var instance;

    before(function() {
      instance = new MessageHub.ConsumerInstance(new MessageHub(services), '', '', {}, false);
    });

    it('prototype.configure', function() {
      Expect(instance.hasOwnProperty('configure'));
    });

    it('prototype.get', function() {
      Expect(instance.hasOwnProperty('get'));
    });

    it('prototype.remove', function() {
      Expect(instance.hasOwnProperty('remove'));
    });
  });

  describe('[Client.ConsumerInstance] Functionality', function() {
    var consumerGroupName, consumerInstanceName;
    var consumerInstance;
    var instance;
    var produceInterval;

    beforeEach('Create a new instance of Message Hub client', function(done) {
      var consumerSetup = false;

      instance = new MessageHub(services, { 'https': !useMockService });
      consumerGroupName = CONSUMER_GROUP_NAME + TestUtils.generateID();
      consumerInstanceName = CONSUMER_INSTANCE_NAME + TestUtils.generateID();

      produceInterval = setInterval(function() {
        instance.produce(TOPIC_NAME, MESSAGE_DATA)
          .then(function(r) {
            // Make sure done is only called once,
            // but allow at least one message to be published.
            if(consumerSetup) {
              consumerSetup = false;
              done();
            }
          });
      }, 250);

      instance.topics.create(TOPIC_NAME)
        .then(function(repsonse) {
          return instance.consume(consumerGroupName, consumerInstanceName, CONSUMER_OPTIONS);
        })
        .then(function(response) {
          consumerInstance = response[0];
          consumerSetup = true;
        })
        .fail(function(error) {
          done(new Error('Consumer should have been set up: ' + error.message));
        });
    });

    afterEach('Remove consumer instance', function(done) {
      clearInterval(produceInterval);

      for(var index in instance.consumerInstances) {
        instance.consumerInstances[index].remove();
      }

      instance.topics.delete(TOPIC_NAME)
        .then(function(response) {
          done();
        })
        .fail(function(error) {
          done(new Error('Topic should have been deleted: ' + error));
        });
    });

    it('Constructs a consumer instance via instance.consume', function() {
      Expect(consumerInstance).not.to.be(null);
      Expect(consumerInstance).to.be.an(MessageHub.ConsumerInstance);
    });

    it('Constructs a consumer instance using constructor (force configure)', function(done) {
      var consumerInstanceForceConfigure =
          new MessageHub.ConsumerInstance(
            instance,
            CONSUMER_GROUP_NAME + TestUtils.generateID(),
            CONSUMER_INSTANCE_NAME + TestUtils.generateID(),
            CONSUMER_OPTIONS);

      consumerInstanceForceConfigure.configure()
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an(Array);
          Expect(response.length).to.eql(2);
          Expect(response[0]).not.to.be(null);
          Expect(response[0]).to.be.a(MessageHub.ConsumerInstance);

          consumerInstance.remove();
          done();
        })
        .fail(function(error) {
          done('Configure should have succeeded. Failed with error: ' + JSON.stringify(error));
        });
    });

    it('Successfully retrieves a message and unwraps it by default', function(done) {
      consumerInstance.get(TOPIC_NAME)
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an(Array);
          Expect(response.length).to.be.above(0);
          Expect(response[0]).to.eql(MESSAGE_DATA);
          done();
        })
        .fail(function(error) {
          done(new Error("ConsumerInstance.get should have succeeded. Error: " + error.message));
        });
    });

    it('Successfully retrieves a message and unwraps it when explicitly told to', function(done) {
      consumerInstance.get(TOPIC_NAME, true)
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an(Array);
          Expect(response.length).to.be.above(0);
          Expect(response[0]).to.eql(MESSAGE_DATA);
          done();
        })
        .fail(function(error) {
          done(new Error("ConsumerInstance.get should have succeeded. Error: " + error.message));
        });
    });

    it('Successfully retrieves a message and does not unwrap it', function(done) {
      consumerInstance.get(TOPIC_NAME, false)
        .then(function(response) {
          Expect(response).not.to.be(null);
          Expect(response).to.be.an(Array);
          Expect(response.length).to.be.above(0);
          Expect(response[0]).to.be.an('object');
          Expect(response[0]).to.only.have.keys('key', 'value', 'partition', 'offset');
          Expect(response[0].value).not.to.be(null);
          Expect(response[0].value).to.be.a('string');
          Expect(response[0].value).to.eql(new Buffer(MESSAGE_DATA).toString('base64'));
          done();
        })
        .fail(function(error) {
          done(new Error("ConsumerInstance.get should have succeeded. Error: " + error.message));
        });
    });

    it('Deletes itself when asked', function(done) {
      var groupName = CONSUMER_GROUP_NAME + TestUtils.generateID();
      var instanceName = CONSUMER_INSTANCE_NAME + TestUtils.generateID();

      instance.consume(groupName, instanceName, CONSUMER_OPTIONS)
        .then(function(response) {
          return response[0].remove();
        })
        .then(function(response) {
          // Kafka returns 204 'No Content' on
          // consumer instance removal
          done();
        })
        .fail(function(response) {
          done(new Error("ConsumerInstance.remove should have succeeded: "  + response));
        });
    });

    it('Can retrieve status code on error', function(done) {
      consumerInstance.get('topic_which_does_not_exist')
        .then(function(response) {
          done(new Error("ConsumerInstance.get should have failed. Response: " + response));
        })
        .fail(function(error) {
          Expect(error).not.to.be(null);
          Expect(error).to.be.an(Error);
          Expect(error.statusCode).not.to.be(null);
          Expect(error.statusCode).to.be.a('number');
          done();
        });
    });

  });
};
