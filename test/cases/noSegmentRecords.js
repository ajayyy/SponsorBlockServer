var request = require('request');

var utils = require('../utils.js');
const getHash = require('../../src/utils/getHash.js');

var databases = require('../../src/databases/databases.js');
const logger = require('../../src/utils/logger.js');
var db = databases.db;

describe('noSegmentRecords', () => {
  before(() => {
    db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("VIPUser-noSegments") + "')");

    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id', 'sponsor')");
    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id', 'intro')");

    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id-1', 'sponsor')");
    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id-1', 'intro')");
    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'noSubmitVideo', 'sponsor')");

    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'delete-record', 'sponsor')");

    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'delete-record-1', 'sponsor')");
    db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'delete-record-1', 'intro')");
  });

  it('Should update the database version when starting the application', (done) => {
    let version = db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version']).value;
    if (version > 1) done();
    else done('Version isn\'t greater than 1. Version is ' + version);
  });

  it('Should be able to submit categories not in video (http response)', (done) => {
    let json = {
      videoID: 'no-segments-video-id',
      userID: 'VIPUser-noSegments',
      categories: [
        'outro',
        'shilling',
        'shilling',
        'shil ling',
        '',
        'intro'
      ]
    };

    let expected = {
      submitted: [
        'outro',
        'shilling'
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          if (JSON.stringify(body) === JSON.stringify(expected)) {
            done();
          } else {
            done("Incorrect response: expected " + JSON.stringify(expected) + " got " + JSON.stringify(body));
          }
        } else {
          console.log(body);
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to submit categories not in video (sql check)', (done) => {
    let json = {
      videoID: 'no-segments-video-id-1',
      userID: 'VIPUser-noSegments',
      categories: [
        'outro',
        'shilling',
        'shilling',
        'shil ling',
        '',
        'intro'
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['no-segments-video-id-1']);
          if (result.length !== 4) {
            console.log(result);
            done("Expected 4 entrys in db, got " + result.length);
          } else {
            done();
          }
        } else {
          console.log(body);
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to submit categories with _ in the category', (done) => {
    let json = {
      videoID: 'underscore',
      userID: 'VIPUser-noSegments',
      categories: [
        'word_word',
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['underscore']);
          if (result.length !== 1) {
            console.log(result);
            done("Expected 1 entrys in db, got " + result.length);
          } else {
            done();
          }
        } else {
          console.log(body);
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to submit categories with upper and lower case in the category', (done) => {
    let json = {
      videoID: 'bothCases',
      userID: 'VIPUser-noSegments',
      categories: [
        'wordWord',
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['bothCases']);
          if (result.length !== 1) {
            console.log(result);
            done("Expected 1 entrys in db, got " + result.length);
          } else {
            done();
          }
        } else {
          console.log(body);
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should not be able to submit categories with $ in the category', (done) => {
    let json = {
      videoID: 'specialChar',
      userID: 'VIPUser-noSegments',
      categories: [
        'word&word',
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['specialChar']);
          if (result.length !== 0) {
            console.log(result);
            done("Expected 0 entrys in db, got " + result.length);
          } else {
            done();
          }
        } else {
          console.log(body);
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 for missing params', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json: {}}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 for no categories', (done) => {
    let json = {
      videoID: 'test',
      userID: 'test',
      categories: []
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 for no userID', (done) => {
    let json = {
      videoID: 'test',
      userID: null,
      categories: ['sponsor']
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 for no videoID', (done) => {
    let json = {
      videoID: null,
      userID: 'test',
      categories: ['sponsor']
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 object categories)', (done) => {
    let json = {
      videoID: 'test',
      userID: 'test',
      categories: {}
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 bad format categories', (done) => {
    let json = {
      videoID: 'test',
      userID: 'test',
      categories: 'sponsor'
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });
  
  it('Should return 403 if user is not VIP', (done) => {
    let json = {
      videoID: 'test',
      userID: 'test',
      categories: [
        'sponsor'
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 403) {
          done();
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to delete a noSegment record', (done) => {
    let json = {
      videoID: 'delete-record',
      userID: 'VIPUser-noSegments',
      categories: [
        'sponsor'
      ]
    };

    request.delete(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['delete-record']);
          if (result.length === 0) {
            done();
          } else {
            done("Didn't delete record");
          }
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should be able to delete one noSegment record without removing another', (done) => {
    let json = {
      videoID: 'delete-record-1',
      userID: 'VIPUser-noSegments',
      categories: [
        'sponsor'
      ]
    };

    request.delete(utils.getbaseURL() 
     + "/api/noSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['delete-record-1']);
          if (result.length === 1) {
            done();
          } else {
            done("Didn't delete record");
          }
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });


  /*
   * Submission tests in this file do not check database records, only status codes.
   * To test the submission code properly see ./test/cases/postSkipSegments.js
   */

  it('Should not be able to submit a segment to a video with a no-segment record (single submission)', (done) => {
    request.post(utils.getbaseURL() 
    + "/api/postVideoSponsorTimes", {
      json: {
         userID: "testman42",
         videoID: "noSubmitVideo",
         segments: [{
           segment: [20, 40],
           category: "sponsor"
         }]
      }
    }, 
     (err, res, body) => {
       if (err) done(err);
       else if (res.statusCode === 403) {
        done()
       } else {
         done("Status code was " + res.statusCode);
       }
     });
  });

  it('Should not be able to submit segments to a video where any of the submissions with a no-segment record', (done) => {
    request.post(utils.getbaseURL() 
    + "/api/postVideoSponsorTimes", {
      json: {
         userID: "testman42",
         videoID: "noSubmitVideo",
         segments: [{
           segment: [20, 40],
           category: "sponsor"
         },{
          segment: [50, 60],
          category: "intro"
        }]
      }
    }, 
     (err, res, body) => {
       if (err) done(err);
       else if (res.statusCode === 403) {
           done()
       } else {
         done("Status code was " + res.statusCode);
       }
     });
  });


  it('Should  be able to submit a segment to a video with a different no-segment record', (done) => {
    request.post(utils.getbaseURL() 
    + "/api/postVideoSponsorTimes", {
      json: {
         userID: "testman42",
         videoID: "noSubmitVideo",
         segments: [{
           segment: [20, 40],
           category: "intro"
         }]
      }
    }, 
     (err, res, body) => {
       if (err) done(err);
       else if (res.statusCode === 200) {
           done()
       } else {
         done("Status code was " + res.statusCode);
       }
     });
  });

  it('Should be able to submit a segment to a video with no no-segment records', (done) => {
    request.post(utils.getbaseURL() 
    + "/api/postVideoSponsorTimes", {
      json: {
         userID: "testman42",
         videoID: "normalVideo",
         segments: [{
           segment: [20, 40],
           category: "intro"
         }]
      }
    }, 
     (err, res, body) => {
       if (err) done(err);
       else if (res.statusCode === 200) {
           done()
       } else {
         done("Status code was " + res.statusCode);
       }
     });
  });
});