var request = require('request');
var db = require('../../src/databases/databases.js').db;
var utils = require('../utils.js');
var getHash = require('../../src/utils/getHash.js');


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

describe('getSegmentsByHash', () => {
  before(() => {
    let startOfQuery = "INSERT INTO sponsorTimes (videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID) VALUES";
    db.exec(startOfQuery + "('getSegmentsByHash-0', 1, 10, 2, 'getSegmentsByHash-0-0', 'testman', 0, 50, 'sponsor', 0, '" + getHash('getSegmentsByHash-0', 1) + "')"); // hash = fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910
    db.exec(startOfQuery + "('getSegmentsByHash-0', 20, 30, 2, 'getSegmentsByHash-0-1', 'testman', 100, 150, 'intro', 0, '" + getHash('getSegmentsByHash-0', 1) + "')"); // hash = fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910
    db.exec(startOfQuery + "('getSegmentsByHash-noMatchHash', 40, 50, 2, 'getSegmentsByHash-noMatchHash', 'testman', 0, 50, 'sponsor', 0, 'fdaffnoMatchHash')"); // hash = fdaff4dee1043451faa7398324fb63d8618ebcd11bddfe0491c488db12c6c910
    db.exec(startOfQuery + "('getSegmentsByHash-1', 60, 70, 2, 'getSegmentsByHash-1', 'testman', 0, 50, 'sponsor', 0, '" + getHash('getSegmentsByHash-1', 1) + "')"); // hash = 3272fa85ee0927f6073ef6f07ad5f3146047c1abba794cfa364d65ab9921692b
  }); 

  it('Should be able to get a 200', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/3272f?categories=["sponsor", "intro"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200 status code, was " + res.statusCode);
        else {
          done();
        } // pass
      });
  });

  it('Should be able to get a 200 with empty segments for video but no matching categories', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/3272f?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200 status code, was " + res.statusCode);
        else {
          if (JSON.parse(body) && JSON.parse(body).length > 0 && JSON.parse(body)[0].segments.length === 0) {
            done(); // pass
          } else {
            done("response had segments");
          }
        }
      });
  });

  it('Should be able to get a 404 if no videos', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/11111?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 404) done("non 404 status code, was " + res.statusCode);
        else {
          done(); // pass
        }
      });
  });

  it('Should be able to get multiple videos', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/fdaf?categories=["sponsor","intro"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200 status code, was " + res.statusCode);
        else {
          body = JSON.parse(body);
          if (body.length !== 2) done("expected 2 video, got " + body.length);
          else if (body[0].segments.length !== 2) done("expected 2 segments for first video, got " + body[0].segments.length);
          else if (body[1].segments.length !== 1) done("expected 1 segment for second video, got " + body[1].segments.length);
          else done();
        }
      });
  });
});