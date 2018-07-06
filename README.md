## IBM Message Hub REST API Client Module
IBM Message Hub is a scalable, distributed, high throughput message bus to unite your on-premise and off-premise cloud technologies. You can wire micro-services together using open protocols, connect stream data to analytics to realise powerful insight and feed event data to multiple applications to react in real time.

This Node.js module provides a high-level API by which you can interact with the REST API exposed by the Message Hub service. 

__Note__:

From version `2.0.0` onwards, the consume and produce APIs have been removed as the Message Hub Enterprise offering does not support them. Customers should instead use [node-rdkafka](https://www.npmjs.com/package/rdkafka) for Kafka API-level messaging.

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
var topicName = 'mytopic';

instance.topics.create(topicName)
  .then(function(response) {
      console.log('Topic created.');
  })
  .fail(function(error) {
    throw new Error(error);
  });
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
