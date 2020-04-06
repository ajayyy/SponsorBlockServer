var assert = require('assert');
var request = require('request');

var utils = require('../utils.js');

var databases = require('../../src/databases/databases.js');
var db = databases.db;

describe('postSkipSegments', () => {
  it('Should be able to submit a single time (Params method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=djgofQKWmXc&startTime=1&endTime=10&userID=test&category=sponsor", null, 
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

  it('Should be able to submit a single time (JSON method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", JSON.stringify({
       body: {
          videoID: "djgofQKWmXc",
          segments: [{
            segment: [0, 10],
            category: "sponsor"
          }]
       }
     }), 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) {
          let row = db.prepare("SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?").get(videoID);
          if (row.startTime === 0 && row.endTime === 10 && row.category === "sponsor") {
            done()
            return;
          }
        }
        
        done(false);
      });
  });

  it('Should be able to submit multiple times (JSON method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", JSON.stringify({
       body: {
          videoID: "djgofQKWmXc",
          segments: [{
            segment: [0, 10],
            category: "sponsor"
          }, {
            segment: [30, 60],
            category: "intro"
          }]
       }
     }), 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) {
          let rows = db.prepare("SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?").all(videoID);

          if (rows.length !== 2) done(false);
          for (const row of rows) {
            if (row.startTime !== 1 || row.endTime !== 10 || row.category !== "sponsor") {
              done(false)
              return;
            }
          }

          done()
        }
        
        done(false);
      });
  });

  it('Should return 400 for missing params (Params method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?startTime=1&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(false);
        if (res.statusCode === 400) done();
        else done(false);
      });
  });

  it('Should return 400 for missing params (JSON method) 1', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", JSON.stringify({
       body: {
          segments: [{
            segment: [0, 10],
            category: "sponsor"
          }, {
            segment: [30, 60],
            category: "intro"
          }]
       }
     }), 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) done();
        else done(false);
      });
  });
  it('Should return 400 for missing params (JSON method) 2', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", JSON.stringify({
       body: {
        videoID: "djgofQKWmXc"
       }
      }), 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) done();
        else done(false);
      });
  });
  it('Should return 400 for missing params (JSON method) 3', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", JSON.stringify({
       body: {
          videoID: "djgofQKWmXc",
          segments: [{
            segment: [0],
            category: "sponsor"
          }, {
            segment: [30, 60],
            category: "intro"
          }]
       }
      }), 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) done();
        else done(false);
      });
  });
  it('Should return 400 for missing params (JSON method) 4', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", JSON.stringify({
       body: {
          videoID: "djgofQKWmXc",
          segments: [{
            segment: [0, 10]
          }, {
            segment: [30, 60],
            category: "intro"
          }]
       }
      }), 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) done();
        else done(false);
      });
  });
  it('Should return 400 for missing params (JSON method) 5', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", JSON.stringify({
       body: {
          videoID: "djgofQKWmXc"
       }
      }), 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode === 200) done();
        else done(false);
      });
  });
});