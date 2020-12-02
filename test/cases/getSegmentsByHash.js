var request = require('request');
var db = require('../../src/databases/databases.js').db;
var utils = require('../utils.js');
var getHash = require('../../src/utils/getHash.js');

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

  it('Should return 404 if no segments are found even if a video for the given hash is known', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/3272f?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 404) done("non 404 status code, was " + res.statusCode);
        else {
          if (body === '[]') {
            done(); // pass
          } else {
            done("response had videos");
          }
        }
      });
  });

  it('Should be able to get an empty array if no videos', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/11111?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 404) done("non 404 status code, was " + res.statusCode);
        else {
          if (JSON.parse(body).length === 0 && body === '[]') done(); // pass
          else done("non empty array returned");
        }
      });
  });

  it('Should return 400 prefix too short', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/11?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 400) done("non 400 status code, was " + res.statusCode);
        else {
          done(); // pass
        }
      });
  });

  it('Should return 400 prefix too long', (done) => {
    let prefix = new Array(50).join('1');
    if (prefix.length <= 32) { // default value, config can change this
      done('failed to generate a long enough string for the test ' + prefix.length);
      return;
    }

    request.get(utils.getbaseURL() 
     + '/api/skipSegments/'+prefix+'?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 400) done("non 400 status code, was " + res.statusCode);
        else {
          done(); // pass
        }
      });
  });

  it('Should not return 400 prefix in range', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/11111?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode === 400) done("prefix length 5 gave 400 " + res.statusCode);
        else {
          done(); // pass
        }
      });
  });

  it('Should return 404 for no hash', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/?categories=["shilling"]', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 404) done("expected 404, got " + res.statusCode);
        else {
          done(); // pass
        }
      });
  });

  it('Should return 500 for bad format categories', (done) => { // should probably be 400
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/?categories=shilling', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 500) done("expected 500 got " + res.statusCode);
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

  it('Should be able to get 200 for no categories (default sponsor)', (done) => {
    request.get(utils.getbaseURL() 
     + '/api/skipSegments/fdaf', null, 
      (err, res, body) => {
        if (err) done("Couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200 status code, was " + res.statusCode);
        else {
          body = JSON.parse(body);
          if (body.length !== 2) done("expected 2 videos, got " + body.length);
          else if (body[0].segments.length !== 1) done("expected 1 segments for first video, got " + body[0].segments.length);
          else if (body[1].segments.length !== 1) done("expected 1 segments for second video, got " + body[1].segments.length);
          else if (body[0].segments[0].category !== 'sponsor' || body[1].segments[0].category !== 'sponsor') done("both segments are not sponsor");
          else done();
        }
      });
  });

  it('Should be able to post a segment and get it using endpoint', (done) => {
    let testID = 'abc123goodVideo';
    request.post(utils.getbaseURL() 
      + "/api/postVideoSponsorTimes", {
        json: {
          userID: "test",
          videoID: testID,
          segments: [{
            segment: [13, 17],
            category: "sponsor"
          }]
        }
      }, 
      (err, res, body) => {
        if (err) done('(post) ' + err);
        else if (res.statusCode === 200) {
          request.get(utils.getbaseURL() 
            + '/api/skipSegments/'+getHash(testID, 1).substring(0,3), null, 
              (err, res, body) => {
                if (err) done("(get) Couldn't call endpoint");
                else if (res.statusCode !== 200) done("(get) non 200 status code, was " + res.statusCode);
                else {
                  body = JSON.parse(body);
                  if (body.length !== 1) done("(get) expected 1 video, got " + body.length);
                  else if (body[0].segments.length !== 1) done("(get) expected 1 segments for first video, got " + body[0].segments.length);
                  else if (body[0].segments[0].category !== 'sponsor') done("(get) segment should be sponsor, was "+body[0].segments[0].category);
                  else done();
                }
              });
        } else {
          done("(post) non 200 status code, was " + res.statusCode);
        }
      }
    );
  });
});