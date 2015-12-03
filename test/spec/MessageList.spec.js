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

  describe('[Client.MessageList] API', function() {
    var instance;

    beforeEach(function() {
      instance = new MessageHub.MessageList();
    });

    it('Has a length getter which returns the length of the internal array', function() {
      Expect(instance.hasOwnProperty('length'));
      Expect(instance.length).not.to.be(null);
      Expect(instance.length).to.be.an('number');
    });

    it('prototype.push and returns instance for chaining', function() {
      var result = instance.push('test');

      Expect(instance.hasOwnProperty('push'));
      Expect(result).not.to.be(null);
      Expect(result).to.eql(instance);
    });

    it('prototype.pop and returns instance for chaining', function() {
      var result = instance.push('test');

      Expect(instance.hasOwnProperty('pop'));

      result = instance.pop();

      Expect(result).not.to.be(null);
      Expect(result).to.eql(instance);
    });
  });

  describe('[Client.MessageList] Functionality', function() {

    it('Constructs an empty array of records with no argument passed', function() {
      var list = new MessageHub.MessageList();

      Expect(list.messages).not.to.be(null);
      Expect(list.messages).to.be.an('object');
      Expect(list.messages).to.only.have.keys('records');
      Expect(list.messages.records).to.be.an(Array);
      Expect(list.messages.records.length).to.eql(0);
      Expect(list.length).to.eql(0);
    });

    it('Constructs an empty array of records with an empty array argument passed', function() {
      var list = new MessageHub.MessageList([]);

      Expect(list.messages).not.to.be(null);
      Expect(list.messages).to.be.an('object');
      Expect(list.messages).to.only.have.keys('records');
      Expect(list.messages.records).to.be.an(Array);
      Expect(list.messages.records.length).to.eql(0);
      Expect(list.length).to.eql(0);
    });

    it('Throws an exception if the init argument passed is not an array', function() {
      // undefined and null implicitly tested in the following test(s):
      // - Constructs an empty array of records with no argument passed
      var input = [{ an: 'object' }, 1.4, 'string'];

      for(var index in input) {
        try {
          new MessageHub.MessageList(input[index]);
          Expect().fail('MessageList Constructor should have thrown exception with value: ' + input[index]);
        } catch(e) {
          Expect(e).not.to.be(null);
          Expect(e).to.be.a(TypeError);
        }
      }
    });

    it('Pushes valid value to records array', function() {
      var message = 'test';
      var messageObject = { a: 'test' };
      var list = new MessageHub.MessageList().push(message).push(messageObject);
      var list2 = new MessageHub.MessageList();
      list2.push(message);
      list2.push(messageObject);

      Expect(list.messages.records.length).to.eql(2);
      Expect(list.length).to.eql(2);
      Expect(list.messages.records[0].value).to.eql(new Buffer(message).toString('base64'));
      Expect(list.messages.records[1].value).to.eql(new Buffer(JSON.stringify(messageObject)).toString('base64'));

      Expect(list2.messages.records.length).to.eql(2);
      Expect(list2.length).to.eql(2);
      Expect(list2.messages.records[0].value).to.eql(new Buffer(message).toString('base64'));
      Expect(list2.messages.records[1].value).to.eql(new Buffer(JSON.stringify(messageObject)).toString('base64'));
    });

    it('Throws exception when invalid values are pushed', function() {
      var list = new MessageHub.MessageList();
      var input = [undefined, null];

      for(var index in input) {
        try {
         list.push(input[index]);
         Expect().fail('Exception should have been thrown with value: ' + input[index]);
        } catch(e) {
          Expect(e).not.to.be(null);
          Expect(e).to.be.a(ReferenceError);
        }
      }
    });

    it('Correctly pops values', function() {
      var list = new MessageHub.MessageList().push('test');
      var list2 = new MessageHub.MessageList().push('test').pop();

      list.pop();

      Expect(list.length).to.eql(0);
      Expect(list.messages.records.length).to.eql(0);
      Expect(list2.length).to.eql(0);
      Expect(list2.messages.records.length).to.eql(0);
    });

    it('Correctly retrieves values from a list', function() {
      var list = new MessageHub.MessageList();
      list.push('a string');
      list.push({ an: 'object' });

      Expect(list.get(0)).to.be.a('string');
      Expect(list.get(0)).to.eql('a string');

      Expect(list.get(1)).to.be.an('object');
      Expect(list.get(1)).to.eql({ an: 'object' });
    });

    it('Floors floating-point numbers when retrieving values', function() {
      var list = new MessageHub.MessageList();
      list.push('a string');
      Expect(list.get(0.7)).to.be.a('string');
    });

    it('Throws exception when invalid values are provided', function() {
      var list = new MessageHub.MessageList();
      list.push('a string');

      var input = [{ invalid: 0 }, null, undefined, 1, -1];
      var expected = [TypeError, TypeError, TypeError, RangeError, RangeError];

      for(var i in input) {
        try {
         list.get(input[i]);
         Expect().fail('Exception should have been thrown with value: ' + input[index]);
        } catch(e) {
          Expect(e).not.to.be(null);
          Expect(e).to.be.a(expected[i]);
        }
      }
    });

  });

};
