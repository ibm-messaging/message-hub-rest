/**
 * Copyright 2015, 2018 IBM
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
 * © Copyright IBM Corp. 2015, 2018
*/
'use strict';

var Url = require('url');
var Utils = require('./utils');
var Q = require('q');

var CONTENT_TYPE = 'application/vnd.kafka.binary.v1+json';
var APPLICATION_JSON = 'application/json';

/**
 * Client (Constructor)
 * Constructs a new Client object, provided with Bluemix VCAP_SERVICES
 * and additional options used to help connect to a particular service.
 * @param services  Object retrieved from process.env.VCAP_SERVICES or cfenv package.
 * @param opts      Additional options used to connect to a particular service.
 *                    Current keys:
 *                      - isStaging (Boolean): If set to true, the constructor will look for the
 *                      "messagehubstaging" key, rather than "messagehub".
*/
var Client = function(services, opts) {
  opts = opts || {
    'https': true,
  };

  if(!opts.hasOwnProperty('https')) {
    opts.https = true;
  }

  this.config = opts;
  this.topics.parent = this;

  if(services !== undefined) {
    var serviceNamePrefix = "messagehub";
    var serviceIndex = 0;
    var serviceName;

    // Search for 'messagehub' prefix.
    for(var name in services) {
      if(name.substr(0, serviceNamePrefix.length) === serviceNamePrefix) {
        serviceName = name;
      }
    }

    if(services[serviceName]) {
      for(var index in services[serviceName]) {
        if(services[serviceName][index].hasOwnProperty("label")
          && services[serviceName][index].label == serviceName)
        {
          serviceIndex = index;
        }
      }

      this.apiKey = services[serviceName][serviceIndex].credentials.api_key;
      this.url = Url.parse(services[serviceName][serviceIndex].credentials.kafka_admin_url);
      this.consumerInstances = { };
    } else {
      throw new Error(serviceNamePrefix + '* is not provided in the services environment variable. ' +
                      'Make sure you have bound the Message Hub service to your Bluemix application');
    }
  } else {
    throw new Error('Provided services environment variable is undefined!');
  }
};

Client.prototype.topics = { };

/**
 * Client.prototype.topics.get
 * Retrieves a list of all topics connected to the provided API key.
 *
 * @returns Promise object which will be fulfilled when the request
 *          to the service resolves.
*/
Client.prototype.topics.get = function() {
  var requestOptions = {
    host: this.parent.url.hostname,
    port: this.parent.url.port,
    path: '/admin/topics',
    method: 'GET',
    headers: {
      'X-Auth-Token': this.parent.apiKey
    },
  };

  return Utils.request(requestOptions, { https: this.parent.config.https });
};

/**
 * Client.prototype.topics.create
 * Creates a topic of the specified name.
 *
 * @param topic           The topic name for the service to create.
 * @param partitions      The number of partitions the topic should use.
 * @param retentionHours  The number of hours to retain messages on this topic. Minimum is
 *                        24 hours, if retentionHours is less than this, it will be set to
 *                        the minimum.
 * @returns               Promise object which will be fulfilled when the request
 *                        to the service resolves.
*/
Client.prototype.topics.create = function(topic, partitions, retentionHours) {
  if(topic && typeof(topic) === 'string' && topic.length > 0) {
    if(!partitions || (partitions && typeof(partitions) !== 'number') || partitions < 1) {
      partitions = 1;
    }

    if(!retentionHours || (retentionHours && typeof(retentionHours) !== 'number') || retentionHours < 24) {
      retentionHours = 24;
    }

    var requestOptions = {
      host: this.parent.url.hostname,
      port: this.parent.url.port,
      path: '/admin/topics',
      method: 'POST',
      headers: {
        'X-Auth-Token': this.parent.apiKey,
        'Content-Type': APPLICATION_JSON
      },
    };

    var retentionMs = retentionHours * 60 * 60 * 1000;

    return Utils.request(
      requestOptions,
      {
        https: this.parent.config.https,
        acceptedResponseCodes: [202],
        ignoredErrorCodes: [42201]
      },
      {
        name: topic,
        partitions: partitions,
        configs: {
          retentionMs: retentionMs
        }
      });
  } else {
    var deferred = Q.defer();

    if(!topic) {
      deferred.reject(new ReferenceError('Provided topic parameter cannot be undefined.'));
    } else if(typeof(topic) !== 'string') {
      deferred.reject(new TypeError('Provided topic parameter must be of type "string".'));
    } else {
      deferred.reject(new Error('Provided topic parameter must have length greater than zero.'));
    }

    return deferred.promise;
  }
};

/**
 * Client.prototype.topics.delete
 * Deletes a topic of the specified name.
 *
 * @param topic     The topic name to delete from the service.
 * @returns         Promise object which will be fulfilled when the request
 *                  to the service resolves.
*/
Client.prototype.topics.delete = function(topic) {
  if(topic && typeof(topic) === 'string' && topic.length > 0) {
    var requestOptions = {
      host: this.parent.url.hostname,
      port: this.parent.url.port,
      path: '/admin/topics/' + topic,
      method: 'DELETE',
      headers: {
        'X-Auth-Token': this.parent.apiKey
      },
    };

    return Utils.request(
      requestOptions,
      {
        https: this.parent.config.https,
        acceptedResponseCodes: [202]
      });
  } else {
    var deferred = Q.defer();

    if(!topic) {
      deferred.reject(new ReferenceError('Provided topic parameter cannot be undefined.'));
    } else if(typeof(topic) !== 'string') {
      deferred.reject(new TypeError('Provided topic parameter must be of type "string".'));
    } else {
      deferred.reject(new Error('Provided topic parameter must have length greater than zero.'));
    }

    return deferred.promise;
  }
};

module.exports = Client;
