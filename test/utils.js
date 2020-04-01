var config = require('../src/config.js');

module.exports = {
  getbaseURL: () => {
    return "http://localhost:" + config.port;
  }
};