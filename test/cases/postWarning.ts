import request from 'request';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('postWarning', () => {
    before(() => {
        db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("warning-vip") + "')");
    });

    it('Should be able to create warning if vip (exp 200)', (done: Done) => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0',
        };

        request.post(getbaseURL()
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
    it('Should not be able to create warning if vip (exp 403)', (done: Done) => {
        let json = {
            issuerUserID: 'warning-not-vip',
            userID: 'warning-1',
        };

        request.post(getbaseURL()
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
