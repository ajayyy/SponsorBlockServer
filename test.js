var Mocha = require('mocha'),
    fs = require('fs'),
    path = require('path');

var config = require('./src/config.js');
// delete old test database
fs.unlinkSync(config.db);
fs.unlinkSync(config.privateDB);

var createServer = require('./src/app.js');
var createMockServer = require('./test/mocks.js');

// Instantiate a Mocha instance.
var mocha = new Mocha();

var testDir = './test/cases'

// Add each .js file to the mocha instance
fs.readdirSync(testDir).filter(function(file) {
    // Only keep the .js files
    return file.substr(-3) === '.js';

}).forEach(function(file) {
    mocha.addFile(
        path.join(testDir, file)
    );
});

var mockServer = createMockServer(() => {
  console.log("Started mock HTTP Server");
  var server = createServer(() => {
    console.log("Started main HTTP server");
    // Run the tests.
    mocha.run(function(failures) {
      mockServer.close();
      server.close();
      process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
    });
  });
});
