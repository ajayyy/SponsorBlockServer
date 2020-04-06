var assert = require('assert');
var request = require('request');

var utils = require('../utils.js');

var databases = require('../../src/databases/databases.js');
var db = databases.db;

describe('postVideoSponsorTime (Old submission method)', () => {
  it('Should be able to submit a time (GET)', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=djgofQKWmXc&startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) {
          let row = db.prepare("SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?").get(videoID);
          if (row.startTime === 1 && row.endTime === 10 && row.category === "sponsor") {
            done()
            return;
          }
        }
        
        done(false);
      });
  });

  it('Should be able to submit a time (POST)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=djgofQKWmXc&startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) {
          let row = db.prepare("SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?").get(videoID);
          if (row.startTime === 1 && row.endTime === 10 && row.category === "sponsor") {
            done()
            return;
          }
        }
        
        done(false);
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