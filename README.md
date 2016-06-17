## IBM Message Hub REST API Client Module
IBM Message Hub is a scalable, distributed, high throughput message bus to unite your on-premise and off-premise cloud technologies. You can wire micro-services together using open protocols, connect stream data to analytics to realise powerful insight and feed event data to multiple applications to react in real time.

This Node.js module provides a high-level API by which you can interact with the REST API exposed by the Message Hub service.

## Getting Started
### Prerequisites
You will need a Node.js 0.12.x runtime environment to use this module.
This can be installed from http://nodejs.org/download/, or by using your operating system's package manager.

### Installation Instructions
Installing using npm:
```
npm install message-hub-rest
```

### Run Tests
* To run against a mock Kafka service, use ```npm test```
* __Important Note__: Running tests against a live service (with the '--real' flag) is will incur a fee and as such is not recommended.

### Example Usage:
The following example sets up a connection to the Message Hub REST API, creates a topic, consumer and producer, then produces and consumes a few messages before exiting.

```javascript
var MessageHub = require('message-hub-rest');
var services = process.env.VCAP_SERVICES;
var instance = new MessageHub(services);
var consumerInstance;
var topicName = 'mytopic';

instance.topics.create(topicName)
  .then(function(response) {
      return instance.consume('my_consumer_group', 'my_consumer_instance', { 'auto.offset.reset': 'largest' });
  })
  .then(function(response) {
    consumerInstance = response[0];
  })
  .fail(function(error) {
    throw new Error(error);
  });

var receivedMessages = 0;
var produceInterval = setInterval(function() {

  var list = new MessageHub.MessageList([
    "This is the message text"
  ]);

  instance.produce('mytopic', list.messages)
    .then(function() {
      return consumerInstance.get('mytopic');
    })
    .then(function(data) {
      console.log(data);
      receivedMessages++;

      if(receivedMessages >= 3) {
        clearInterval(produceInterval);
        return consumerInstance.remove();
      }
    })
    .fail(function(error) {
      throw new Error(error);
    });

}, 1000);
```

## API

### MessageHub(services, [opts])
Constructs a new Client object, provided with Bluemix VCAP_SERVICES and additional options used to help connect to a particular service.
* `services` - (Object) VCAP_SERVICES of your Bluemix Message Hub service.
* `opts` - (Object) Optional configuration options used when connecting to the service. Properties include:
  * __https__, (Boolean) (optional), make HTTPS requests to the service. Defaults to true, should only be set to false when testing against a mock Kafka service.

Instantiate with the `new` keyword. When instantiated correctly, a new MessageHub/Client object will be returned. Throws an error with an accompanying message if the provided services information is incorrect.

### MessageHub.prototype.topics.get()
Retrieves a list of all topics connected to the provided API key.

Returns a Promise object which will be fulfilled when the request to the service resolves.

### MessageHub.prototype.topics.create(topic, partitions, retentionHours)
Creates a topic of the specified name. __Important Note__: Creating topics incurs a fee - check the Bluemix documentation
for more information.
* `topic` - (String) (required), the topic name for the service to create.
* `partitions` - (Number) (optional), the number of partitions to use for this topic. Defaults to 1.
* `retentionHours` - (Number) (optional), the number of hours to retain messages on this topic. Minimum is 24 hours, if retentionHours is less than this, it will be set to the minimum.

Returns a Promise object which will be fulfilled when the request to the service resolves.

### MessageHub.prototype.topics.delete(topic)
Deletes a topic of the specified name.
* `topic` - (String) (required), the topic name to delete from the service.

Returns a Promise object which will be fulfilled when the request to the service resolves.

### MessageHub.prototype.produce(topic, message)
Produces a message on the specified topic.
* `topic` - (String) (required), the topic name for the new messages to be produced on.
* `message` - (String|Array|MessageHub.MessageList|Object) (required), the message object to be pushed to the service.

Returns a Promise object which will be fulfilled when the request to the service resolves.

### MessageHub.prototype.consume(groupName, instanceName, [options])
Configures a consumer instance of the specified name.
* `groupName` - (String) (required), the name of the consumer group. If the group doesn't exist, one is created.
* `instanceName` - (String) (required), the name of the consumer group instance.
* `options` - (Object) (optional), additional options which can be provided to configure the consumer group.

Returns an instance of `MessageHub.ConsumerInstance`.

### MessageHub.ConsumerInstance(client, groupName, instanceName, [options], [configure])
Constructs a new ConsumerInstance object. Usually not created directly, it is recommended to use `Client.prototype.consume`.
* `groupName` - (String) (required), the name of the consumer group. If the group doesn't exist, one is created.
* `instanceName` - (String) (required), the name of the consumer group instance.
* `options` - (Object) (optional), additional options which can be provided to configure the consumer group.
* `configure` - (Boolean) (optional), flag used to automatically configure the instance. Defaults to true.

Returns an instance of `MessageHub.ConsumerInstance`.

### MessageHub.ConsumerInstance.prototype.configure()
Configures the consumer instance by sending a request to the Kafka REST service.

Returns a Promise object which will be fulfilled when the request to the service resolves.

### MessageHub.ConsumerInstance.prototype.get(topicName [toValue])
Retrieves a message from the provided topic name.
* `topicName` - (String) (required), the topic to retrieve messages from.
* `toValue` - (Boolean) (optional), unwraps base64 encoded messages, if true. Defaults to true.

Returns a Promise object which will be fulfilled when the request to the service resolves.

### MessageHub.ConsumerInstance.prototype.remove()
Removes the current consumer instance from the server.

Returns a Promise object which will be fulfilled when the request to the service resolves.

### MessageHub.MessageList([init])
Constructs a new instances of the MessageList class. An initial array of values can be provided to pre-populate the list with messages.
* `init` - (Array<String>) (optional), array of values to be added to the list of messages.

Returns an instance of `MessageHub.MessageList`, which allows for chaining of other methods.

### MessageHub.MessageList.prototype.length
Returns the number of messages in the message list.

### MessageHub.MessageList.prototype.messages
Returns the list of messages added to the `MessageList` instance.

### MessageHub.MessageList.prototype.push(message)
Convenience wrapper to add messages to 'messages.records'. Also converts all values to base64 strings so they can be sent through the service.

* `message` - (String) (required), the message to be added to the list.

Returns the current `MessageHub.MessageList` instance, which allows for chaining other methods.

### MessageHub.MessageList.prototype.pop()
Convenience wrapper for 'messages.records.pop()', but returns the current MessageList instance to allow chaining of methods.

Returns the current `MessageHub.MessageList` instance, which allows for chaining other methods.

### MessageHub.MessageList.prototype.get(index)
Retrieves a message from the message list, converting it back to its original representation (i.e. JSON string -> object)

* `index` - (number) (required) The index of the list to retrieve.

Returns the original representation of value stored in records array.
