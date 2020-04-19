var express = require('express');
var app = express();

var config = require('../src/config.js');

app.post('/ReportChannelWebhook', (req, res) => {
  res.status(200);
});

app.post('/FirstTimeSubmissionsWebhook', (req, res) => {
  res.status(200);
});

module.exports = function createMockServer(callback) {
  return app.listen(config.mockPort, callback);
} 