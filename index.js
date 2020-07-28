var config = require('./src/config.js');
var createServer = require('./src/app.js');
var server = createServer(() => {
  console.log("Server started on port " + config.port + ".");
});
