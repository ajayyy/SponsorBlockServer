var assert = require('assert');
var request = require('request');

var utils = require('../utils.js');

describe('postVideoSponsorTime', () => {
  it('Should be able to create a time', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=fWvKvOViM3g&startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 200) done();
        else done("non 200 status code: " + res.statusCode + " ("+body+")");
      });
  });

  it('Should return 400 for missing params', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 400) done(); // pass
        else done("non 400 status code: " + res.statusCode + " ("+body+")");
      });
  });


  it('Should be rejected if over 80% of the video', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=qqwerty&startTime=1&endTime=1000000&userID=test", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 403) done(); // pass
        else done("non 403 status code: " + res.statusCode + " ("+body+")");
      });
  });
  
  it('Should be rejected if not a valid videoID', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=knownWrongID&startTime=1&endTime=1000000&userID=test", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 403) done(); // pass
        else done("non 403 status code: " + res.statusCode + " ("+body+")");
      });
  });
});