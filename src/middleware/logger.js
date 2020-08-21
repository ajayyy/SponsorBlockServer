const log = require('../utils/logger.js'); // log not logger to not interfere with function name

module.exports = function logger (req, res, next) {
  log.info('Request recieved: ' + req.url);
  next();
}