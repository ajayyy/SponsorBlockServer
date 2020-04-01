var fs = require('fs');
var config = require('../config.js');

module.exports = function logger (req, res, next) {
  (config.mode === "development") && console.log('Request recieved: ' + req.url);
  next();
}