var request = require('request');
var utils = require('../utils.js');
var db = require('../../src/databases/databases.js').db;
var getHash = require('../../src/utils/getHash.js');

describe('getUserInfo', () => {
  before(() => {
    let startOfUserNamesQuery = "INSERT INTO userNames (userID, userName) VALUES";
    db.exec(startOfUserNamesQuery + "('" + getHash("getuserinfo_user_01") + "', 'Username user 01')");
    let startOfSponsorTimesQuery = "INSERT INTO sponsorTimes (videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden) VALUES";
    db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000001', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 0)");
    db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000002', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 0)");
    db.exec(startOfSponsorTimesQuery + "('yyyxxxzzz', 1, 11, -1, 'uuid000003', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 0)");
    db.exec(startOfSponsorTimesQuery + "('yyyxxxzzz', 1, 11, -2, 'uuid000004', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 1)");
    db.exec(startOfSponsorTimesQuery + "('xzzzxxyyy', 1, 11, -5, 'uuid000005', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 1)");
    db.exec(startOfSponsorTimesQuery + "('zzzxxxyyy', 1, 11, 2, 'uuid000006', '" + getHash("getuserinfo_user_02") + "', 0, 10, 'sponsor', 0)");
    db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000007', '" + getHash("getuserinfo_user_02") + "', 0, 10, 'sponsor', 1)");
    db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000008', '" + getHash("getuserinfo_user_02") + "', 0, 10, 'sponsor', 1)");
  });

  it('Should be able to get a 200', (done) => {
    request.get(utils.getbaseURL()
     + '/api/getUserInfo?userID=getuserinfo_user_01', null,
      (err, res, body) => {
        if (err) {
          done('couldn\'t call endpoint');
        } else {
          if (res.statusCode !== 200) {
            done('non 200');
          } else {
            done(); // pass
          }
        }
      });
  });

  it('Should be able to get a 400 (No userID parameter)', (done) => {
    request.get(utils.getbaseURL()
     + '/api/getUserInfo', null,
      (err, res, body) => {
        if (err) {
          done('couldn\'t call endpoint');
        } else {
          if (res.statusCode !== 400) {
            done('non 400');
          } else {
            done(); // pass
          }
        }
      });
  });

  it('Should return info', (done) => {
    request.get(utils.getbaseURL()
     + '/api/getUserInfo?userID=getuserinfo_user_01', null,
      (err, res, body) => {
        if (err) {
          done("couldn't call endpoint");
        } else {
          if (res.statusCode !== 200) {
            done("non 200");
          } else {
            const data = JSON.parse(body);
            if (data.userName !== 'Username user 01') {
              return done('Returned incorrect userName "' + data.userName + '"');
            }
            if (data.minutesSaved !== 5) {
              return done('Returned incorrect minutesSaved "' + data.minutesSaved + '"');
            }
            if (data.viewCount !== 30) {
              return done('Returned incorrect viewCount "' + data.viewCount + '"');
            }
            if (data.segmentCount !== 3) {
              return done('Returned incorrect segmentCount "' + data.segmentCount + '"');
            }
            done(); // pass
          }
        }
      });
  });

  it('Should return userID for userName (No userName set)', (done) => {
    request.get(utils.getbaseURL()
     + '/api/getUserInfo?userID=getuserinfo_user_02', null,
      (err, res, body) => {
        if (err) {
          done('couldn\'t call endpoint');
        } else {
          if (res.statusCode !== 200) {
            done('non 200');
          } else {
            const data = JSON.parse(body);
            if (data.userName !== 'c2a28fd225e88f74945794ae85aef96001d4a1aaa1022c656f0dd48ac0a3ea0f') {
              return done('Did not return userID for userName');
            }
            done(); // pass
          }
        }
      });
  });
});
