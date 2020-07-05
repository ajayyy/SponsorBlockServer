var assert = require('assert');
var request = require('request');

var utils = require('../utils.js');

var databases = require('../../src/databases/databases.js');
var db = databases.db;

describe('postVideoSponsorTime (Old submission method)', () => {
  it('Should be able to submit a time (GET)', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcQ&startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let row = db.prepare('get', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcQ"]);
          if (row.startTime === 1 && row.endTime === 10 && row.category === "sponsor") {
            done()
          } else {
            done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
          }
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to submit a time (POST)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcE&startTime=1&endTime=11&userID=test", null, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let row = db.prepare('get', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcE"]);
          if (row.startTime === 1 && row.endTime === 11 && row.category === "sponsor") {
            done()
          } else {
            done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
          }
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 for missing params', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(err);
        if (res.statusCode === 400) done();
        else done("Status code was: " + res.statusCode);
      });
  });
});