
var fs = require('fs');
var config = undefined;

console.log(process.env.npm_lifecycle_script)

// Check to see if launched in test mode
if (process.env.npm_lifecycle_script === 'node test.js') {
  config = JSON.parse(fs.readFileSync('test.json'));
} else {
  config = JSON.parse(fs.readFileSync('config.json'));
}

module.exports = config;