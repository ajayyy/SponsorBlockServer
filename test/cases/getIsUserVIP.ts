import request from 'request';
import {getbaseURL, Done} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getIsUserVIP', () => {
    before(() => {
        db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("supertestman") + "')");
    });

    it('Should be able to get a 200', (done: Done) => {
        request.get(getbaseURL()
            + "/api/isUserVIP?userID=supertestman", null,
            (err, res) => {
                if (err) done("couldn't call endpoint");
                else if (res.statusCode !== 200) done("non 200: " + res.statusCode);
                else done(); // pass
            });
    });


    it('Should get a 400 if no userID', (done: Done) => {
        request.get(getbaseURL()
            + "/api/isUserVIP", null,
            (err, res) => {
                if (err) done("couldn't call endpoint");
                else if (res.statusCode !== 400) done("non 400: " + res.statusCode);
                else done(); // pass
            });
    });

    it('Should say a VIP is a VIP', (done: Done) => {
        request.get(getbaseURL()
            + "/api/isUserVIP?userID=supertestman", null,
            (err, res, body) => {
                if (err) done("couldn't call endpoint");
                else if (res.statusCode !== 200) done("non 200: " + res.statusCode);
                else {
                    if (JSON.parse(body).vip === true) done(); // pass
                    else done("Result was non-vip when should have been vip");
                }
            });
    });

    it('Should say a normal user is not a VIP', (done: Done) => {
        request.get(getbaseURL()
            + "/api/isUserVIP?userID=regulartestman", null,
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
