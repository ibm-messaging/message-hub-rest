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
      this.url = Url.parse(services[serviceName][serviceIndex].credentials.kafka_rest_url);
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

/**
 * Client.prototype.produce
 * Produces a message on the specified topic.
 *
 * @param topic     The topic name for the new messages to be produced on.
 * @param message   The message object to be pushed to the service.
 * @returns         Response object generated by the service.
*/
Client.prototype.produce = function(topic, message) {
  if(typeof(topic) === 'string' && topic.length > 0 && message) {
    var requestOptions = {
      host: this.url.hostname,
      port: this.url.port,
      path: '/topics/' + topic,
      method: 'POST',
      headers: {
        'X-Auth-Token': this.apiKey,
        'Content-Type': CONTENT_TYPE
      },
    };

    var input = null;

    if(message instanceof MessageList) {
      input = message.messages;
    } else if(Array.isArray(message)) {
      input = new MessageList(message).messages;
    } else if(typeof(message) === 'object') {
      if(!message.records) {
        input = new MessageList([JSON.stringify(message)]).messages;
      } else {
        input = message;
      }
    } else {
      input = new MessageList([message]).messages;
    }

    return Utils.request(requestOptions, { https: this.config.https }, input);
  } else {
    var deferred = Q.defer();

    if(!message) {
      deferred.reject(new ReferenceError('Provided message object cannot be undefined.'));
    } else if(typeof(topic) !== 'string') {
      deferred.reject(new TypeError('Provided topic parameter must be of type "string".'));
    } else {
      deferred.reject(new Error('Provided topic parameter must have length greater than zero.'));
    }

    return deferred.promise;
  }
};

/**
 * Client.prototype.consume
 * Configures a consumer instance of the specified name.
 *
 * @param groupName    The name of the consumer group. If the group doesn't exist, one is created.
 * @param instanceName The name of the consumer group instance.
 * @param options      Options provided to configure the consumer group.
 * @returns            Consumer group instance object.
*/
Client.prototype.consume = function(groupName, instanceName, options) {
  return new Client.ConsumerInstance(this, groupName, instanceName, options, false).configure();
};

/**
 * Client.ConsumerInstance (Constructor)
 * Constructs a new ConsumerInstance object. Usually not created directly,
 * it is recommended to use Client.prototype.consume.
 *
 * @param client        The Message Hub client object associated with this consumer instance.
 * @param groupName     The name of the consumer group the instance is attached to.
 * @param instanceName  The name to assign to the consumer instance.
 * @param options       Options provided to configure the consumer group.
 * @param configure     Flag used to automatically configure the instance.
*/
var ConsumerInstance = Client.ConsumerInstance = function(client, groupName, instanceName, options, configure) {
  if(!(client instanceof Client)) {
    throw new TypeError('Provided client parameter must be an instance of Client.');
  }

  configure = typeof configure === 'boolean' ? configure : true;

  this.client = client;
  this.groupName = groupName;
  this.instanceName = instanceName;
  this.options = options;
  // a map to keep track of topic -> request promise. we will use this to
  // ensure that only one request per consumer isntance per topic is pending
  // at a given time - avoids kafka errors
  this._topicGetMap = {};

  if(configure) {
    this.configure();
  }
};

/**
 * Client.ConsumerInstance.prototype.configure
 * Configures the consumer instance by sending a request to
 * the Kafka REST service.
*/
ConsumerInstance.prototype.configure = function() {
  var deferred = Q.defer();
  var instance = this;
  var requestOptions = {
    host: this.client.url.hostname,
    port: this.client.url.port,
    path: "/consumers/" + this.groupName,
    method: 'POST',
    headers: {
      'X-Auth-Token': this.client.apiKey,
      'Content-Type': CONTENT_TYPE
    },
  };

  var configOptions = {
    https: this.client.config.https,
    ignoredErrorCodes: [409],
  };

  if(!this.groupName) {
    deferred.reject(new ReferenceError('Provided groupName parameter cannot be undefined.'));
  } else if(!(typeof(this.groupName) === 'string' && this.groupName.length > 0)) {
    deferred.reject(new TypeError('Provided groupName parameter must be a non-zero length string.'));
  }

  if(!this.instanceName) {
    deferred.reject(new ReferenceError('Provided instanceName parameter cannot be undefined.'));
  } else if(!(typeof(this.groupName) === 'string' && this.instanceName.length > 0)) {
    deferred.reject(new TypeError('Provided instanceName parameter must be a non-zero length string.'));
  }

  // Generate the message to be sent to the server. Copy all
  // properties to the message defined in the opts variable.
  var message = {
    'id': this.instanceName,
    'format': 'binary',
  };

  if(this.options !== undefined) {
    for(var option in this.options) {
      if(!message.hasOwnProperty(option)) {
        message[option] = this.options[option];
      }
    }
  }

  if(deferred.promise.inspect().state !== 'rejected')
  {
    deferred.resolve();
    return Utils.request(requestOptions, configOptions, message)
      .then(function(responseData) {
        instance.client.consumerInstances[instance.groupName + instance.instanceName] = instance;
        return [instance, responseData];
      });
  } else {
    return deferred.promise;
  }
};

/**
 * Client.ConsumerInstance.prototype.get
 * Retrieves messages from the provided topic name.
 *
 * @param topicName   The topic to retrieve messages from.
 * @param toValue     Unwraps base64 encoded messages, if set to true.
 * @returns           Promise object which will be fulfilled when the request
 *                    to the service resolves.
*/
ConsumerInstance.prototype.get = function(topicName, toValue) {
  // if there's already a promise pending for a given topic, return that instead
  // of issuing a new get. this prevents the Kafka error: `Another request is in
  // progress for consumer "test:test1". Request may be retried when response is
  // received for the previous request.
  if (this._topicGetMap[topicName]) {
    return this._topicGetMap[topicName];
  }

  // if we don't have a request already "out", proceed with business as usual
  if(toValue !== undefined && typeof(toValue) !== 'boolean') {
    console.warn('Provided parameter toValue is not a boolean, defaulting to true.');
    toValue = true;
  } else if(toValue === undefined) {
    // Silently default to true
    toValue = true;
  }

  var req = Utils.request({
    host: this.client.url.hostname,
    port: this.client.url.port,
    path: '/consumers/' + this.groupName + '/instances/' + this.instanceName + '/topics/' + topicName,
    method: 'GET',
    headers: {
      'X-Auth-Token': this.client.apiKey,
      'Accept': CONTENT_TYPE
    },
  }, {
    https: this.client.config.https,
  });

  // Convert the response to pure values without Kafka metadata.
  var prom;
  if(toValue) {
    prom = req.then(function(data) {
      var output = [];
      for(var index in data) {
        output.push(new Buffer(data[index].value, 'base64').toString('utf8'));
      }
      return output;
    });
  } else {
    prom = req;
  }

  // Keep track of the promise in our topic map, make sure to clean up when
  // request is complete
  this._topicGetMap[topicName] = prom.then(function() {
    delete this._topicGetMap[topicName];
    // return all arguments to ensure proper promise chaining
    return arguments;
  }.bind(this));

  return prom;
};

/**
 * Client.ConsumerInstance.prototype.remove
 * Removes the current consumer instance from the server.
*/
ConsumerInstance.prototype.remove = function() {
  var client = this.client;
  var groupName = this.groupName;
  var instanceName = this.instanceName;

  return Utils.request({
    host: this.client.url.hostname,
    port: this.client.url.port,
    path: '/consumers/' + this.groupName + '/instances/' + this.instanceName,
    method: 'DELETE',
    headers: {
      'X-Auth-Token': this.client.apiKey,
      'Accept': CONTENT_TYPE,
    },
  }, {
    https: this.client.config.https,
    acceptedResponseCodes: [200, 204],
  }).then(function(response) {
    delete client.consumerInstances[groupName + instanceName];
    // Defer response to next handler
    return response;
  });
};

/**
 * Client.MessageList (Constructor)
 * Constructs a new instances of the MessageList class. An initial
 * array of values can be provided to pre-populate the list with
 * messages.
 *
 * @param init    Array of values to be added to the list of messages.
 * @returns       An instance of MessageList, which allows for chaining other methods.
*/
var MessageList = Client.MessageList = function(init) {
  this.messages = { 'records': [] };

  // Push initial values into the records array. If the
  // provided value is undefined, just ignore it.
  if(init !== undefined) {
    if(Array.isArray(init)) {
      for(var index in init) {
        this.push(init[index]);
      }
    } else {
      throw new TypeError('The provided init variable must be an array.');
    }
  }

  this.__defineGetter__('length', function() {
    return this.messages.records.length;
  });
};

/**
 * Client.MessageList.prototype.push
 * Convenience wrapper to add messages to 'messages.records'. Also converts all values
 * to base64 strings so they can be sent through the service.
 *
 * @param message   The message to be added to the list.
 * @returns         The current MessageList instance, which allows for chaining other methods.
*/
MessageList.prototype.push = function(message) {
  if(message) {
    // Convert inputs to base64 strings
    if(Buffer.isBuffer(message)) {
      message = message.toString('base64');
    } else if(typeof message === 'object') {
      message = new Buffer(JSON.stringify(message)).toString('base64');
    } else {
      message = new Buffer(message).toString('base64');
    }

    this.messages.records.push({ 'value': message });

    // Return object instance to allow chaining.
    return this;
  } else {
    throw new ReferenceError('Provided message is undefined.');
  }
};

/**
 * Client.MessageList.prototype.pop
 * Convenience wrapper for 'messages.records.pop()', but returns the current
 * MessageList instance to allow chaining of methods.
 *
 * @returns   Current MessageList instance.
*/
MessageList.prototype.pop = function() {
  this.messages.records.pop();
  return this;
};

/**
 * Client.MessageList.prototype.get
 * Retrieves a message from the message list, converting it back to
 * its original representation (i.e. JSON string -> object)
 *
 * @param index   The index of the list to retrieve.
 * @returns       Original representation of value stored in records array.
*/
MessageList.prototype.get = function(index) {
  if(typeof index !== 'number') {
    throw new TypeError('The index provided must be a number.');
  } else {
    index = index | 0;
  }

  if(this.messages && this.messages.records) {
    if(index >= 0 && index < this.messages.records.length) {
      var base64String = this.messages.records[index].value;
      var originalString = new Buffer(base64String, 'base64').toString();
      var result;

      // Attempt to convert to JSON
      try {
        result = JSON.parse(originalString);
      } catch(e) {
        // SyntaxError thrown if the string it not JSON. In
        // this case, just assign the converted string to the result.
        result = originalString;
      }

      return result;
    } else {
      throw new RangeError('Index ' + index + ' is out of bounds. The number of records in the list is ' + this.messages.records.length + '.');
    }
  } else {
    throw new ReferenceError('The messages object is undefined or null.');
  }
}

module.exports = Client;
