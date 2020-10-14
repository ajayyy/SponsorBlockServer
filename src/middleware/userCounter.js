const fetch = require('node-fetch');

const config = require('../config.js');
const getIP = require('../utils/getIP.js');
const getHash = require('../utils/getHash.js');
const logger = require('../utils/logger.js');

module.exports = function userCounter(req, res, next) {
    fetch(config.userCounterURL + "/api/v1/addIP?hashedIP=" + getHash(getIP(req), 1), { method: "POST" })
        .catch(() => logger.debug("Failing to connect to user counter at: " + config.userCounterURL))

    next();
}