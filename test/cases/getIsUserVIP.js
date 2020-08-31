var request = require('request');
var utils = require('../utils.js');
var db = require('../../src/databases/databases.js').db;
var getHash = require('../../src/utils/getHash.js');

describe('getIsUserVIP', () => {
  before(() => {
    db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("supertestman") + "')");
  }); 

  it('Should be able to get a 200', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getIsUserVIP?userID=supertestman", null, 
      (err, res, body) => {
        if (err) done("couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200: " + res.statusCode);
        else done(); // pass
      });
  });


  it('Should get a 400 if no userID', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getIsUserVIP", null, 
      (err, res, body) => {
        if (err) done("couldn't call endpoint");
        else if (res.statusCode !== 400) done("non 400: " + res.statusCode);
        else done(); // pass
      });
  });

  it('Should say a VIP is a VIP', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getIsUserVIP?userID=supertestman", null, 
      (err, res, body) => {
        if (err) done("couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200: " + res.statusCode);
        else {
          if (JSON.parse(body).vip === true) done(); // pass
          else done("Result was non-vip when should have been vip");
        }
      });
  });

  it('Should say a normal user is not a VIP', (done) => {
    request.get(utils.getbaseURL() 
     + "/api/getIsUserVIP?userID=regulartestman", null, 
      (err, res, body) => {
        if (err) done("couldn't call endpoint");
        else if (res.statusCode !== 200) done("non 200: " + res.statusCode);
        else {
          if (JSON.parse(body).vip === false) done(); // pass
          else done("Result was vip when should have been non-vip");
        }
      });
  });
});