var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));

module.exports = function getIP(req) {
  return config.behindProxy ? req.headers['x-forwarded-for'] : req.connection.remoteAddress;
}