const config = require('../config.js');
const getIP = require('../utils/getIP.js');
const getHash = require('../utils/getHash.js');
const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: config.rateLimit.vote.windowMs,
  max: config.rateLimit.vote.max,
  message: config.rateLimit.vote.message,
  headers: false,
  keyGenerator: (req /*, res*/) => {
    return getHash(req.ip, 1);
  },
  skip: (/*req, res*/) => {
    // skip rate limit if running in test mode
    return process.env.npm_lifecycle_script === 'node test.js';
  }
});
