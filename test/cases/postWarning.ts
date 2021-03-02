import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('postWarning', () => {
    before(() => {
        db.prepare("run", "INSERT INTO vipUsers (userID) VALUES ('" + getHash("warning-vip") + "')");
    });

    it('Should be able to create warning if vip (exp 200)', (done: Done) => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0',
        };
        fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                let row = await db.prepare('get', "SELECT userID, issueTime, issuerUserID, enabled FROM warnings WHERE userID = ?", [json.userID]);
                if (row?.enabled == 1 && row?.issuerUserID == getHash(json.issuerUserID)) {
                    done();
                } else {
                    done("Warning missing from database");
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be not be able to create a duplicate warning if vip', (done: Done) => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0',
        };

        fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 409) {
                let row = await db.prepare('get', "SELECT userID, issueTime, issuerUserID, enabled FROM warnings WHERE userID = ?", [json.userID]);
                if (row?.enabled == 1 && row?.issuerUserID == getHash(json.issuerUserID)) {
                    done();
                } else {
                    done("Warning missing from database");
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to remove warning if vip', (done: Done) => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0',
            enabled: false
        };

        fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                let row = await db.prepare('get', "SELECT userID, issueTime, issuerUserID, enabled FROM warnings WHERE userID = ?", [json.userID]);
                if (row?.enabled == 0) {
                    done();
                } else {
                    done("Warning missing from database");
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should not be able to create warning if vip (exp 403)', (done: Done) => {
        let json = {
            issuerUserID: 'warning-not-vip',
            userID: 'warning-1',
        };

        fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 403) {
                done();
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });
});
