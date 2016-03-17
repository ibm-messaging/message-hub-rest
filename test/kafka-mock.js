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

var Express = require('express');
var Https = require('https');
var Fs = require('fs');
var BodyParser = require('body-parser');

var MockService = function(verbose) {
  var instance = this;
  this.app = Express();
  this.verbose = verbose || false;
  this.lastMessageFrom = { };
  this.topics = [];

  // Tell body-parser to accept Kafka application
  // MIME type
  var vndKafkaParser = BodyParser.json({ 'type': 'application/vnd.kafka.binary.v1+json' });
  var jsonParser = BodyParser.json();

  this.app.use(vndKafkaParser);
  this.app.use(jsonParser);

  /*
   * Topics REST API
   *
   * Returns list of created topics on GET request,
   * returns '202: Topic creation pending' on good
   * POST request, or '422: Unprocessable entity' on
   * bad request.
  */
  this.app.route('/admin/topics')
    .get(function(request, response, next) {
      response.send(JSON.stringify(instance.topics));
    })
    .post(function(request, response, next) {
      if(typeof(request.body.name) === 'string') {
        var inList = false;

        for(var index in instance.topics) {
          if(instance.topics[index].name === request.body.name) {
            inList = true;
          }
        }

        if(!inList) {
          instance.topics.push({ name: request.body.name, partitions: request.body.partitions || 1 });
          response.sendStatus(202);
        } else {
          response.status(422).send({ errorCode: 42201, errorMessage: 'Topic already exists.' });
        }
      } else {
        response.sendStatus(422);
      }
    });

  this.app.route('/admin/topics/:topicName')
    .delete(function(request, response, next) {
      var inList = false;
      var index = 0;

      while(index < instance.topics.length && !inList) {
        if(request.params.topicName === instance.topics[index].name) {
          instance.topics.splice(index, 1);
          inList = true;
        }

        index++;
      }

      if(inList) {
        response.sendStatus(202);
      } else {
        response.sendStatus(404);
      }
    });

  /*
   * Produce Messages REST API
   *
   * Returns static response data, similar to that of
   * a real Kafka REST response. The request body data
   * is stored for future retrieval.
  */
  this.app.route('/topics/:topicName')
    .post(function(request, response, next) {
      // Dummy results or use real ones?
      var responseData = {
        'offsets': [{
          'partition': 0,
          'offset': 123,
          'error_code': null,
          'error': null,
        }],
        'key_schema_id': null,
        'value_schema_id': null,
      };

      if(request.body.records) {
        var result = [];

        for(var index in request.body.records) {
          result.push(request.body.records[index].value);
        }

        instance.lastMessageFrom[request.params.topicName] = result;
      }

      response.send(JSON.stringify(responseData));
    });

  /*
   * Consumer Group REST API
   *
   * Mock REST API for generating a consumer groupName
   * and consumer instance.
  */
  this.app.route('/consumers/:groupName')
    .post(function(request, response, next) {
      response.send(JSON.stringify({
        'instance_id': request.body.id,
        'base_uri': 'http://localhost:' + instance.port + '/consumers/' + request.params.groupName + '/instances/' + request.body.id,
      }));
    });

  /*
   * Consumer Instance REST API
   *
   * Returns data stored in instance.lastMessageFrom, which is
   * updated via the "Produce Messages" mock REST API. Key, partition
   * and offset values do not change in this instance.
  */
  this.app.route('/consumers/:groupName/instances/:instanceName/topics/:topicName')
    .get(function(request, response, next) {
      var inList = false;
      var index = 0;

      while(index < instance.topics.length && !inList) {
        if(request.params.topicName === instance.topics[index].name) {
          inList = true;
        }

        index++;
      }

      if(!inList) {
        response.sendStatus(404);
        return;
      }

      var result = [];
      var topicName = request.params.topicName;
      instance.lastMessageFrom[topicName] = instance.lastMessageFrom[topicName] || [];

      // Convert received messages into the form
      // of a Kafka message consumption response.
      for(var index in instance.lastMessageFrom[topicName]) {
        result.push({
          'key': null,
          'value': instance.lastMessageFrom[topicName][index],
          'partition': 0,
          'offset': 1234,
        });
      }

      response.send(JSON.stringify(result));
    });

  /*
   * Delete Consumer Instance REST API
   *
   * Returns "204 No Content" when API is called to
   * delete a consumer instance.
  */
  this.app.route('/consumers/:groupName/instances/:instanceName')
    .delete(function(request, response, next) {
      response.sendStatus(204);
    });

  /*
   * All other routes:
   *
   * Send "404 Not Found".
  */
  this.app.route('*')
    .all(function(request, response, next) {
      response.send(JSON.stringify({
        'error_code': 404,
        'message': 'HTTP 404 Not Found.',
      }));
    });
};

/**
 * MockService.prototype.start
 * Starts the Mock Kafka REST service. Will log a status message
 * if the instance is set to verbose.
 *
 * @param port      The port that the mock service should start on.
*/
MockService.prototype.start = function(port) {
  if(this.app) {
    this.port = port || 8000;

    this.server = this.app.listen(port, function() {
      if(this.verbose) {
        console.log('Mock Kafka REST Service started on port ' + port);
      }
    });
  }
};

/**
 * MockService.prototype.stop
 * Stops the Mock Kafka REST service. Will log a status message
 * if the instance is set to verbose.
 *
 * @param port      The port that the mock service should start on.
*/
MockService.prototype.stop = function() {
  if(this.server) {
    if(this.verbose) {
      console.log('Closing Mock Kafka REST Service.');
    }

    this.server.close();
  }
};

module.exports = MockService;
