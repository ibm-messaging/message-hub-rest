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

// Accept unsigned certificates in development environment.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Note: Run with 'mocha run-test.js'
// To run against a real service, include '--real' flag
var PORT = 8000;
var Fs = require('fs');
var KafkaMock = require('./kafka-mock');

var specFiles = Fs.readdirSync('./test/spec');
var kafkaMock = new KafkaMock();
var useMockService = true;
var argv = process.argv;
// Used as VCAP_SERVICES environment variable.
var services = { };
// Values captured by process.argv
var argApiKey;
var argRestUrl;

for(var index in argv) {
  switch(argv[index]) {
    case '--real':
      useMockService = false;
      break;

    case '--url':
      argRestUrl = argv[++index];
      break;

    case '--key':
      argApiKey = argv[++index];
      break;

    case '--help':
      console.log('--- run-tests.js Help ---');
      console.log('Flags:');
      console.log('--real\tRun the tests against a live service (this action will incur a fee for partition usage)');
      console.log('--url\tThe URL of the Kafka service');
      console.log('--key\tThe API Key used to connect to the service');
      process.exit(0);
      break;
  }
}

// Configure Message Hub VCAP_SERVICES information,
// dependant on whether the tests are running against
// a real service. If they are, real credentials are used.
if(useMockService) {
  kafkaMock.start(PORT);
  services["messagehub"] = [
      {
         "name": "Message Hub-1e",
         "label": "messagehub",
         "plan": "beta",
         "credentials": {
            "api_key": "an_api_key",
            "kafka_rest_url": "http://localhost:" + PORT,
         }
      }
   ];
} else {
  if(!argRestUrl) {
    throw new Error('A Kafka REST URL must be provided via the --url flag.');
  }

  if(!argApiKey) {
    throw new Error('An API key must be provided via the --key flag.');
  }

  console.log("Tests may take a few seconds, as they are working on a live service.");

  services["messagehub"] = [
    {
      "label": "messagehub",
      "credentials": {
        "api_key": argApiKey,
        "kafka_rest_url": argRestUrl,
      }
    }
  ];
}

// Run all tests in listed spec files.
for(var index in specFiles) {
  if(specFiles[index].substr(specFiles[index].length - 8, 8) === '.spec.js') {
    require('./spec/' + specFiles[index]).run(services, PORT, useMockService);
  }
}
