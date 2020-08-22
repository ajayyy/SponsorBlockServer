var request = require('request');

var utils = require('../utils.js');
const getHash = require('../../src/utils/getHash.js');

var databases = require('../../src/databases/databases.js');
var db = databases.db;

describe('postNoSegments', () => {
  before(() => {
    db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("VIPUser-noSegments") + "')");
  });

  it('should update the database version when starting the application', (done) => {
    let version = db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version']).value;
    if (version > 1) done();
    else done('Version isn\'t greater that 1. Version is ' + version);
  });

  it('Should be able to submit no segments', (done) => {
    let json = {
      videoID: 'noSegmentsTestVideoID',
      userID: 'VIPUser-noSegments',
      categorys: [
        'sponsor'
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 200) {
          //let row = db.prepare('get', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["noSegmentsTestVideoID"]);
          //if (row.startTime === 2 && row.endTime === 10 && row.category === "sponsor") {
            done()
          //} else {
          //  done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
          //}
        } else {
          console.log(body);
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 for missing params', (done) => {
    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json: {}}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 for no categorys', (done) => {
    let json = {
      videoID: 'test',
      userID: 'test',
      categorys: []
    };

    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json}, 
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
      categorys: ['sponsor']
    };

    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json}, 
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
      categorys: ['sponsor']
    };

    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 object categorys)', (done) => {
    let json = {
      videoID: 'test',
      userID: 'test',
      categorys: {}
    };

    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 400) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });

  it('Should return 400 bad format categorys', (done) => {
    let json = {
      videoID: 'test',
      userID: 'test',
      categorys: 'sponsor'
    };

    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json}, 
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
      categorys: [
        'sponsor'
      ]
    };

    request.post(utils.getbaseURL() 
     + "/api/postNoSegments", {json}, 
      (err, res, body) => {
        if (err) done(err);
        else if (res.statusCode === 403) {
          done()
        } else {
          done("Status code was " + res.statusCode);
        }
      });
  });
});