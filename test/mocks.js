var express = require('express');
var app = express();

var config = require('../src/config.js');

app.post('/ReportChannelWebhook', (req, res) => {
  console.log("report mock hit");
  res.status(200);
});

app.post('/FirstTimeSubmissionsWebhook', (req, res) => {
  console.log("first time submisson mock hit");
  res.status(200);
});

module.exports = function createMockServer(callback) {
  return app.listen(config.mockPort, callback);
} 