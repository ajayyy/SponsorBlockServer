var request = require('request');

var config = require('../config.js');
var getIP = require('../utils/getIP.js');
const getHash = require('../utils/getHash.js');

module.exports = function userCounter(req, res, next) {
    request.post(config.userCounterURL + "/api/v1/addIP?hashedIP=" + getHash(getIP(req), 1));

    next();
}