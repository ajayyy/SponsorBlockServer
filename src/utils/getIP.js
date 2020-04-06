var fs = require('fs');
var config = require('./config.js');

module.exports = function getIP(req) {
  return config.behindProxy ? req.headers['x-forwarded-for'] : req.connection.remoteAddress;
}