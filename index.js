var config = require('./src/config.js');
var createServer = require('./src/app.js');
const logger = require('./src/utils/logger.js');
var server = createServer(() => {
  logger.info("Server started on port " + config.port + ".");
});
