var request = require('request');
var db = require('../../src/databases/databases.js').db;
var utils = require('../utils.js');

/*
 *CREATE TABLE IF NOT EXISTS "sponsorTimes" (
	"videoID"	TEXT NOT NULL,
	"startTime"	REAL NOT NULL,
	"endTime"	REAL NOT NULL,
	"votes"	INTEGER NOT NULL,
	"UUID"	TEXT NOT NULL UNIQUE,
	"userID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL,
	"views"	INTEGER NOT NULL,
	"shadowHidden"	INTEGER NOT NULL
);
 */

describe('getSkipSegments', () => {
  before(() => {
    db.exec("INSERT INTO sponsorTimes VALUES ('testtesttest', 1, 11, 2, '1-uuid-0', 'testman', 0, 50, 'sponsor', 0)");
    db.exec("INSERT INTO sponsorTimes VALUES ('testtesttest', 20, 33, 2, '1-uuid-2', 'testman', 0, 50, 'intro', 0)");
    db.exec("INSERT INTO sponsorTimes VALUES ('testtesttest,test', 1, 11, 2, '1-uuid-1', 'testman', 0, 50, 'sponsor', 0)");
    db.exec("INSERT INTO sponsorTimes VALUES ('test3', 1, 11, 2, '1-uuid-4', 'testman', 0, 50, 'sponsor', 0)");
    db.exec("INSERT INTO sponsorTimes VALUES ('test3', 1, 11, 2, '1-uuid-5', 'testman', 0, 50, 'sponsor', 0)");
  }); 
  

  it('Should be able to get a time by category', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/skipSegments?videoID=testtesttest&category=sponsor", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 200) done("Status code was: " + res.statusCode);
        else {
            let data = JSON.parse(res.body);
            if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0") {
                    done();
            } else {
                done("Received incorrect body: " + res.body);
            }
        }
      });
  });

  it('Should be possible to send unexpected query parameters', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/skipSegments?videoID=testtesttest&fakeparam=hello&category=sponsor", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 200) done("Status code was: " + res.statusCode);
        else {
            let data = JSON.parse(res.body);
            if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0") {
                    done();
            } else {
                done("Received incorrect body: " + res.body);
            }
        }
      });
  });

  it('Should return 404 if no segment found', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/skipSegments?videoID=notarealvideo", null, 
      (err, res, body) => {
        if (err) done("couldn't call endpoint");
        else if (res.statusCode !== 404) done("non 404 respone code: " + res.statusCode);
        else done(); // pass
      });
  });
  

  it('Should be able send a comma in a query param', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/skipSegments?videoID=testtesttest,test&category=sponsor", null, 
      (err, res, body) => {
            if (err) done("Couldn't call endpoint");
            else if (res.statusCode !== 200) done("Status code was: " + res.statusCode);
            else {
                let data = JSON.parse(res.body);
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-1") {
                        done();
                } else {
                    done("Received incorrect body: " + res.body);
                }
            }
      });
  });

});