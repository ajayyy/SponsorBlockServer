var fs = require('fs');
var config = require('../config.js');

module.exports = function getIP(req) {
  if (config.behindProxy === true) config.behindProxy = "X-Forwarded-For";

  switch (config.behindProxy) {
    case "X-Forwarded-For":
      return req.headers['X-Forwarded-For'];
    case "Cloudflare":
      return req.headers['CF-Connecting-IP'];
    case "X-Real-IP":
      return req.headers['X-Real-IP'];
    default:
      return req.connection.remoteAddress;
  }
}