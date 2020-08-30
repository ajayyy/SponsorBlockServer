var express = require('express');
var app = express();

var config = require('../src/config.js');

app.post('/ReportChannelWebhook', (req, res) => {
  res.sendStatus(200);
});

app.post('/FirstTimeSubmissionsWebhook', (req, res) => {
  res.sendStatus(200);
});

app.post('/CompletelyIncorrectReportWebhook', (req, res) => {
  res.sendStatus(200);
});

app.get('/NeuralBlock/api/checkSponsorSegments', (req, res) => {
  if (req.query.vid === "LevkAjUE6d4") {
    res.json({
      probabilities: [0.69]
    });
    return;
  }
  res.sendStatus(500);
});

//getSponsorSegments is no longer being used for automod
app.get('/NeuralBlock/api/getSponsorSegments', (req, res) => {
  if (req.query.vid === "LevkAjUE6d4") {
    res.json({
      sponsorSegments: [[0.47,7.549],[264.023,317.293]]
    });
    return;
  }
  res.sendStatus(500);
});

module.exports = function createMockServer(callback) {
  return app.listen(config.mockPort, callback);
} 