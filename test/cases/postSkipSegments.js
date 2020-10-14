var assert = require('assert');
var request = require('request');
var config = require('../../src/config.js');
var getHash = require('../../src/utils/getHash.js');

var utils = require('../utils.js');

var databases = require('../../src/databases/databases.js');
var db = databases.db;
const getHash = require('../../src/utils/getHash.js');

describe('postSkipSegments', () => {
  before(() => {
    let startOfQuery = "INSERT INTO sponsorTimes (videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID) VALUES";
    
    db.exec(startOfQuery + "('80percent_video', 0, 1000, 0, '80percent-uuid-0', '" + getHash("test") + "', 0, 0, 'interaction', 0, '80percent_video')");
    db.exec(startOfQuery + "('80percent_video', 1001, 1005, 0, '80percent-uuid-1', '" + getHash("test") + "', 0, 0, 'interaction', 0, '80percent_video')");
    db.exec(startOfQuery + "('80percent_video', 0, 5000, -2, '80percent-uuid-2', '" + getHash("test") + "', 0, 0, 'interaction', 0, '80percent_video')");

    const now = Date.now();
    const warnVip01Hash = getHash("warn-vip01");
    const warnUser01Hash = getHash("warn-user01");
    const warnUser02Hash = getHash("warn-user02");
    const MILLISECONDS_IN_HOUR = 3600000;
    const warningExpireTime = MILLISECONDS_IN_HOUR * config.hoursAfterWarningExpires;
    const startOfWarningQuery = 'INSERT INTO warnings (userID, issueTime, issuerUserID) VALUES';
    db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + now + "', '" + warnVip01Hash + "')");
    db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + (now-1000) + "', '" + warnVip01Hash + "')");
    db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + (now-2000) + "', '" + warnVip01Hash + "')");
    db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + (now-3601000) + "', '" + warnVip01Hash + "')");
    db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + now + "', '" + warnVip01Hash + "')");
    db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + now + "', '" + warnVip01Hash + "')");
    db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + (now-(warningExpireTime + 1000)) + "', '" + warnVip01Hash + "')");
    db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + (now-(warningExpireTime + 2000)) + "', '" + warnVip01Hash + "')");
  });
  
  it('Should be able to submit a single time (Params method)', (done) => {
    request.post(utils.getbaseURL()
     + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcR&startTime=2&endTime=10&userID=test&category=sponsor", null,
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let row = db.prepare('get', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcR"]);
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
          let row = db.prepare('get', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcF"]);
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
          let rows = db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcR"]);
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
  }).timeout(5000);

  it('Should allow multiple times if total is under 80% of video(JSON method)', (done) => {
    request.post(utils.getbaseURL()
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "L_jWHffIx5E",
          segments: [{
            segment: [3, 3000],
            category: "sponsor"
          },{
            segment: [3002, 3050],
            category: "intro"
          },{
            segment: [45, 100],
            category: "interaction"
          },{
            segment: [99, 170],
            category: "sponsor"
          }]
       }
     },
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let rows = db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ? and votes > -1", ["L_jWHffIx5E"]);
          let success = true;
          if (rows.length === 4) {
            for (const row of rows) {
              if ((row.startTime !== 3 || row.endTime !== 3000 || row.category !== "sponsor") &&
                  (row.startTime !== 3002 || row.endTime !== 3050 || row.category !== "intro") &&
                  (row.startTime !== 45 || row.endTime !== 100 || row.category !== "interaction") &&
                  (row.startTime !== 99 || row.endTime !== 170 || row.category !== "sponsor")) {
                success = false;
                break;
              }
            }
          }

          if (success) done();
          else done("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  }).timeout(5000);

  it('Should reject multiple times if total is over 80% of video (JSON method)', (done) => {
    request.post(utils.getbaseURL()
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "n9rIGdXnSJc",
          segments: [{
            segment: [0, 2000],
            category: "interaction"
          },{
            segment: [3000, 4000],
            category: "sponsor"
          },{
            segment: [1500, 2750],
            category: "sponsor"
          },{
            segment: [4050, 4750],
            category: "intro"
          }]
       }
     },
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          let rows = db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ? and votes > -1", ["n9rIGdXnSJc"]);
          let success = true;
          if (rows.length === 4) {
            for (const row of rows) {
              if ((row.startTime === 0 || row.endTime === 2000 || row.category === "interaction") ||
                  (row.startTime === 3000 || row.endTime === 4000 || row.category === "sponsor") ||
                  (row.startTime === 1500 || row.endTime === 2750 || row.category === "sponsor") ||
                  (row.startTime === 4050 || row.endTime === 4750 || row.category === "intro")) {
                success = false;
                break;
              }
            }
          }

          if (success) done();
          else 
          done("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  }).timeout(5000);

  it('Should reject multiple times if total is over 80% of video including previosuly submitted times(JSON method)', (done) => {
    request.post(utils.getbaseURL()
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "test",
          videoID: "80percent_video",
          segments: [{
            segment: [2000, 4000],
            category: "sponsor"
          },{
            segment: [1500, 2750],
            category: "sponsor"
          },{
            segment: [4050, 4750],
            category: "sponsor"
          }]
       }
     },
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          let rows = db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ? and votes > -1", ["80percent_video"]);
          let success = true && rows.length == 2;
          for (const row of rows) {
            if ((row.startTime === 2000 || row.endTime === 4000 || row.category === "sponsor") ||
                (row.startTime === 1500 || row.endTime === 2750 || row.category === "sponsor") ||
                (row.startTime === 4050 || row.endTime === 4750 || row.category === "sponsor")) {
              success = false;
              break;
            }
          }
          if (success) done();
          else 
          done("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  }).timeout(5000);

  it('Should be accepted if a non-sponsor is less than 1 second', (done) => {
    request.post(utils.getbaseURL()
     + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testing&category=intro", null,
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 200) done(); // pass
        else done("non 200 status code: " + res.statusCode + " ("+body+")");
      });
  });

  it('Should be rejected if a sponsor is less than 1 second', (done) => {
    request.post(utils.getbaseURL()
     + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testing", null,
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 400) done(); // pass
        else done("non 403 status code: " + res.statusCode + " ("+body+")");
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

  it("Should be rejected if NB's predicted probability is <70%.", (done) => {
    request.get(utils.getbaseURL()
     + "/api/postVideoSponsorTimes?videoID=LevkAjUE6d4&startTime=40&endTime=60&userID=testing", null,
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 200) done(); // pass
        else done("non 200 status code: " + res.statusCode + " ("+body+")");
      });
  });

  it('Should be rejected if user has to many active warnings', (done) => {
    request.post(utils.getbaseURL()
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "warn-user01",
          videoID: "dQw4w9WgXcF",
          segments: [{
            segment: [0, 10],
            category: "sponsor"
          }]
       }
     },
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 403) {
          done(); // success
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be accepted if user has some active warnings', (done) => {
    request.post(utils.getbaseURL()
     + "/api/postVideoSponsorTimes", {
       json: {
          userID: "warn-user02",
          videoID: "dQw4w9WgXcF",
          segments: [{
            segment: [50, 60],
            category: "sponsor"
          }]
       }
     },
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          done(); // success
        } else {
          done("Status code was " + res.statusCode + " " + body);
        }
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
