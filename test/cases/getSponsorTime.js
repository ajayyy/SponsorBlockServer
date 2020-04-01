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

describe('getVideoSponsorTime', () => {
  before(() => {
    db.exec("INSERT INTO sponsorTimes VALUES ('testtesttest', 1, 11, 2, 'abc123', 'testman', 0, 50, 0)");
  }); 

  it('Should be able to get a time', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getVideoSponsorTimes?videoID=testtesttest", null, 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode !== 200) done("non 200");
        else done();
      });
  });

  it('Should be able to get the correct time', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getVideoSponsorTimes?videoID=testtesttest", null, 
      (err, res, body) => {
        if (err) done(false);
        else if (res.statusCode !== 200) done("non 200");
        else {
          let parsedBody = JSON.parse(body);
          if (parsedBody.sponsorTimes[0][0] === 1
            && parsedBody.sponsorTimes[0][1] === 11
            && parsedBody.UUIDs[0] === 'abc123') {
            done();
          } else {
            done("Wrong data was returned + " + parsedBody);
          }
        };
      });
  });
});