const config = require('../config.js');
const logger = require('./logger.js');

if (config.redis) {
    const redis = require('redis');
    logger.info('Connected to redis');
    const client = redis.createClient(config.redis);
    module.exports = client;
} else {
    module.exports = {
        get: (key, callback) => {
            callback(false);
        },
        set: (key, value, callback) => {
            callback(false);
        }
    };
}
