var request = require('request');
var utils = require('../utils.js');
var db = require('../../src/databases/databases.js').db;
var getHash = require('../../src/utils/getHash.js');

describe('postWarning', () => {
    before(() => {
      db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("warning-vip") + "')");
    });
  
    it('Should be able to create warning if vip (exp 200)', (done) => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0'
        };

        request.post(utils.getbaseURL() 
          + "/api/warnUser", {json}, 
          (err, res, body) => {
            if (err) done(err);
            else if (res.statusCode === 200) {
                done();
            } else {
                console.log(body);
                done("Status code was " + res.statusCode);
            }
        });
    });
    it('Should not be able to create warning if vip (exp 403)', (done) => {
        let json = {
            issuerUserID: 'warning-not-vip',
            userID: 'warning-1'
        };

        request.post(utils.getbaseURL() 
          + "/api/warnUser", {json}, 
          (err, res, body) => {
            if (err) done(err);
            else if (res.statusCode === 403) {
                done();
            } else {
                console.log(body);
                done("Status code was " + res.statusCode);
            }
        });
    });
});
