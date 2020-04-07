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
    db.exec("INSERT INTO sponsorTimes VALUES ('testtesttest', 1, 11, 2, 'uuid-0', 'testman', 0, 50, 'sponsor', 0)");
    db.exec("INSERT INTO sponsorTimes VALUES ('testtesttest,test', 1, 11, 2, 'uuid-1', 'testman', 0, 50, 'sponsor', 0)");
  }); 

  it('Should be able to get a time', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getVideoSponsorTimes?videoID=testtesttest", null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200");
        else done(); // pass
      });
  });

  it('Should return 404 if no segment found', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getVideoSponsorTimes?videoID=notarealvideo", null, 
      (err, res, body) => {
        if (err) done("couldn't call endpoint");
        else if (res.statusCode !== 404) done("non 404 respone code: " + res.statusCode);
        else done(); // pass
      });
  });


  it('Should be possible to send unexpected query parameters', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getVideoSponsorTimes?videoID=testtesttest&fakeparam=hello", null, 
      (err, res, body) => {
        if (err) done("couldn't callendpoint");
        else if (res.statusCode !== 200) done("non 200");
        else done(); // pass
      });
  });

  it('Should be able send a comma in a query param', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getVideoSponsorTimes?videoID=testtesttest,test", null, 
      (err, res, body) => {
        if (err) done("couln't call endpoint");
        else if (res.statusCode !== 200) done("non 200 response: " + res.statusCode);
        else if (JSON.parse(body).UUIDs[0] === 'uuid-1') done(); // pass
        else done("couldn't parse response");
      });
  });

  it('Should be able to get the correct time', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getVideoSponsorTimes?videoID=testtesttest", null, 
      (err, res, body) => {
        if (err) done("couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200");
        else {
          let parsedBody = JSON.parse(body);
          if (parsedBody.sponsorTimes[0][0] === 1
            && parsedBody.sponsorTimes[0][1] === 11
            && parsedBody.UUIDs[0] === 'uuid-0') {
            done(); // pass
          } else {
            done("Wrong data was returned + " + parsedBody);
          }
        };
      });
  });
});