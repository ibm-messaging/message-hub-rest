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

/**
 * generateID
 * Generate a unique ID. If an ID cannot be generated within
 * 1000 attepmts, the function returns undefined.
 *
 * @param idLength     (optional) Number of characters the ID will contain.
*/
var previousIDs = [];
var generateID = function(idLength) {
  var ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
  var MAX_ATTEMPTS = 1000;
  idLength = idLength || 8;

  for(var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    var result = '';
    for(var i = 0; i < idLength; i++) {
      var index = (Math.random() * ALPHABET.length) | 0;
      result += ALPHABET[index];
    }

    if(previousIDs.indexOf(result) === -1) {
      previousIDs.push(result);
      return result;
    }
  }

  return result;
};

module.exports = {
  generateID: generateID,
};
