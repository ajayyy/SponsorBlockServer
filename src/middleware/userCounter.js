var request = require('request');

const config = require('../config.js');
const getIP = require('../utils/getIP.js');
const getHash = require('../utils/getHash.js');
const logger = require('../utils/logger.js');

module.exports = function userCounter(req, res, next) {
    try {
        request.post(config.userCounterURL + "/api/v1/addIP?hashedIP=" + getHash(getIP(req), 1));
    } catch(e) {
        logger.debug("Failing to connect to user counter at: " + config.userCounterURL);
    }

    next();
}