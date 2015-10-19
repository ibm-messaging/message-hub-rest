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
var KafkaMock = require('../kafka-mock');
var Expect = require('expect.js');

module.exports.run = function(services, port, useMockService) {

  describe('[Client] API', function() {
    var instance;
    var message;

    beforeEach(function() {
      instance = new MessageHub(services);
      message = {
        'records': [{ 'value': new Buffer('Test string').toString('base64') }]
      };
    });

    it('prototype.produce', function() {
      Expect(instance.hasOwnProperty('produce'));
      Expect(instance.produce('mytopic', message).constructor.name).to.eql('Promise');
    });

    it('prototype.consume', function() {
      Expect(instance.hasOwnProperty('consume'));
      Expect(instance.consume('test_consumer_group', 'test_consumer_instance', { })
                          .constructor.name).to.eql('Promise');
    });

    it('Client.ConsumerInstance', function() {
      Expect(MessageHub.ConsumerInstance).to.be.a('function');
    });

    it('Client.MessageList', function() {
      Expect(MessageHub.MessageList).to.be.a('function');
    });

  });

  describe('[Client] Functionality', function() {

    it('Provides relevant service functions on prototype chain', function() {
      var instance = new MessageHub(services);

      Expect(instance.produce).to.be.a('function');
      Expect(instance.consume).to.be.a('function');
    });

    it('Provides helper classes on module.exports', function() {
      Expect(MessageHub).to.be.a('function');
      Expect(MessageHub.MessageList).to.be.a('function');
      Expect(MessageHub.ConsumerInstance).to.be.a('function');
    });

    it('Loads correctly with well-formed VCAP_SERVICES input', function() {
      var instance = new MessageHub(services);
      var sentApiKey;

      // Retrieve the API key sent in the services object.
      for(var index in services["messagehub"]) {
        if(services["messagehub"][index].hasOwnProperty("label")
          && services["messagehub"][index].label == "messagehub")
        {
          sentApiKey = services["messagehub"][index].credentials.api_key;
        }
      }

      Expect(instance.apiKey).not.to.be(undefined);
      Expect(instance.apiKey).to.be.a('string');
      Expect(instance.apiKey).to.equal(sentApiKey);
      Expect(instance.url).not.to.be(undefined);
    });

    it('Defaults https option to true', function() {
      var instance = new MessageHub(services);
      var instanceWithArg = new MessageHub(services);

      Expect(instance.config).not.to.be(null);
      Expect(instance.config.https).not.to.be(null);
      Expect(instance.config.https).to.be(true);

      Expect(instanceWithArg.config).not.to.be(null);
      Expect(instanceWithArg.config.https).not.to.be(null);
      Expect(instanceWithArg.config.https).to.be(true);
    });

    it('Throws an exception if services parameter is undefined or null', function() {
      try {
        new MessageHub(undefined);
      } catch(e) {
        Expect(e).to.be.an(Error);
      }

      try {
        new MessageHub(null);
      } catch(e) {
        Expect(e).to.be.an(Error);
        return;
      }

      done(new Error('MessageHub constructor did not throw an exception.'));
    });

    it('Throws an exception if "messagehub" key is not defined in VCAP_SERVICES', function() {
      try {
        new MessageHub({ });
      } catch(e) {
        Expect(e).to.be.an(Error);
        return;
      }

      done(new Error('MessageHub constructor did not throw an exception.'));
    });

  });

};
