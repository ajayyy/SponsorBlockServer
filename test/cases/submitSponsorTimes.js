var assert = require('assert');
var request = require('request');

var utils = require('../utils.js');

describe('postVideoSponsorTime', () => {
  it('Should be able to create a time', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=djgofQKWmXc&startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) done();
        else done(false);
      });
  });

  it('Should return 400 for missing params', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(false);
        if (res.statusCode === 400) done();
        else done(false);
      });
  });
});