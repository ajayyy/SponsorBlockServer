var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));

module.exports = function logger (req, res, next) {
  (config.mode === "development") && console.log('Request recieved: ' + req.url);
  next();
}