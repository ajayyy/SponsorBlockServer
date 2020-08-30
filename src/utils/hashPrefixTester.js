const config = require('../config.js');
const logger = require('./logger.js');

const minimumPrefix = config.minimumPrefix || '3';
const maximumPrefix = config.maximumPrefix || '32'; // Half the hash.

const prefixChecker = new RegExp('^[\\da-f]{' + minimumPrefix + ',' + maximumPrefix + '}$', 'i');

module.exports = (prefix) => {
    return prefixChecker.test(prefix);
};