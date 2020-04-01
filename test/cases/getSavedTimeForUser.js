var request = require('request');
var utils = require('../utils.js');
var db = require('../../src/databases/databases.js').db;
var getHash = require('../../src/utils/getHash.js');

describe('getSavedTimeForUser', () => {
  before(() => {
    db.exec("INSERT INTO sponsorTimes VALUES ('testtesttest', 1, 11, 2, 'abc1239999', '"+getHash("testman")+"', 0, 50, 0)");
  }); 

  it('Should be able to get a 200', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getSavedTimeForUser?userID=testman", null, 
      (err, res, body) => {
        console.log(res.statusCode);
        if (err) done(false);
        else if (res.statusCode !== 200) done("non 200");
        else done();
      });
  });
});