var config = require('../config.js');

module.exports = function getIP(req) {
  if (config.behindProxy === true || config.behindProxy === "true") config.behindProxy = "X-Forwarded-For";

  switch (config.behindProxy) {
    case "X-Forwarded-For":
      return req.headers['x-forwarded-for'];
    case "Cloudflare":
      return req.headers['cf-connecting-ip'];
    case "X-Real-IP":
      return req.headers['x-real-ip'];
    default:
      return req.connection.remoteAddress;
  }
}
