var assert = require('assert');
var request = require('request');

var utils = require('../utils.js');

var databases = require('../../src/databases/databases.js');
var db = databases.db;

describe('postSkipSegments', () => {
  it('Should be able to submit a single time (Params method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcR&startTime=2&endTime=10&userID=test&category=sponsor", null, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let row = db.prepare("SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?").get("dQw4w9WgXcR");
          if (row.startTime === 2 && row.endTime === 10 && row.category === "sponsor") {
            done()
          } else {
            done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
          }
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to submit a single time (JSON method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "dQw4w9WgXcF",
          segments: [{
            segment: [0, 10],
            category: "sponsor"
          }]
       }
     }, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let row = db.prepare("SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?").get("dQw4w9WgXcF");
          if (row.startTime === 0 && row.endTime === 10 && row.category === "sponsor") {
            done()
          } else {
            done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
          }
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to submit multiple times (JSON method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "dQw4w9WgXcQ",
          segments: [{
            segment: [3, 10],
            category: "sponsor"
          }, {
            segment: [30, 60],
            category: "intro"
          }]
       }
     }, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let rows = db.prepare("SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?").all("dQw4w9WgXcR");
          let success = true;
          if (rows.length === 2) {
            for (const row of rows) {
              if ((row.startTime !== 3 || row.endTime !== 10 || row.category !== "sponsor") &&
                  (row.startTime !== 30 || row.endTime !== 60 || row.category !== "intro")) {
                success = false;
                break;
              }
            }
          }

          if (success) done();
          else done("Submitted times were not saved. Actual submissions: " + JSON.stringify(row));
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be rejected if over 80% of the video', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=qqwerty&startTime=30&endTime=1000000&userID=testing", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 403) done(); // pass
        else done("non 403 status code: " + res.statusCode + " ("+body+")");
      });
  });

  it('Should be allowed if youtube thinks duration is 0', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=noDuration&startTime=30&endTime=10000&userID=testing", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 200) done(); // pass
        else done("non 200 status code: " + res.statusCode + " ("+body+")");
      });
  });
  
  it('Should be rejected if not a valid videoID', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?videoID=knownWrongID&startTime=30&endTime=1000000&userID=testing", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 403) done(); // pass
        else done("non 403 status code: " + res.statusCode + " ("+body+")");
      });
  });

  it('Should return 400 for missing params (Params method)', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes?startTime=9&endTime=10&userID=test", null, 
      (err, res, body) => {
        if (err) done(true);
        if (res.statusCode === 400) done();
        else done(true);
      });
  });

  it('Should return 400 for missing params (JSON method) 1', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          segments: [{
            segment: [9, 10],
            category: "sponsor"
          }, {
            segment: [31, 60],
            category: "intro"
          }]
       }
     }, 
      (err, res, body) => {
        if (err) done(true);
        else if (res.statusCode === 400) done();
        else done(true);
      });
  });
  it('Should return 400 for missing params (JSON method) 2', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", {
       json: {
        userID: "test",
        videoID: "dQw4w9WgXcQ"
       }
      }, 
      (err, res, body) => {
        if (err) done(true);
        else if (res.statusCode === 400) done();
        else done(true);
      });
  });
  it('Should return 400 for missing params (JSON method) 3', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "dQw4w9WgXcQ",
          segments: [{
            segment: [0],
            category: "sponsor"
          }, {
            segment: [31, 60],
            category: "intro"
          }]
       }
      }, 
      (err, res, body) => {
        if (err) done(true);
        else if (res.statusCode === 400) done();
        else done(true);
      });
  });
  it('Should return 400 for missing params (JSON method) 4', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "dQw4w9WgXcQ",
          segments: [{
            segment: [9, 10]
          }, {
            segment: [31, 60],
            category: "intro"
          }]
       }
      }, 
      (err, res, body) => {
        if (err) done(true);
        else if (res.statusCode === 400) done();
        else done(true);
      });
  });
  it('Should return 400 for missing params (JSON method) 5', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "dQw4w9WgXcQ"
       }
      }, 
      (err, res, body) => {
        if (err) done(true);
        else if (res.statusCode === 400) done();
        else done(true);
      });
  });
});