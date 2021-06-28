import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('postWarning', () => {
    beforeAll(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [getHash("warning-vip")]);
    });

    it('Should be able to create warning if vip (exp 200)', async () => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0',
            reason: 'warning-reason-0'
        };
        const res = await fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 200) {
            let row = await db.prepare('get', `SELECT "userID", "issueTime", "issuerUserID", enabled, "reason" FROM warnings WHERE "userID" = ?`, [json.userID]);
            if (row?.enabled != 1 || row?.issuerUserID != getHash(json.issuerUserID) && row?.reason === json.reason) {
                throw new Error("Warning missing from database");
            }
        } else {
            const body = await res.text();
            console.log(body);
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be not be able to create a duplicate warning if vip', async () => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0',
        };

        const res = await fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 409) {
            let row = await db.prepare('get', `SELECT "userID", "issueTime", "issuerUserID", enabled FROM warnings WHERE "userID" = ?`, [json.userID]);
            if (row?.enabled != 1 || row?.issuerUserID != getHash(json.issuerUserID)) {
                throw new Error("Warning missing from database");
            }
        } else {
            const body = await res.text();
            console.log(body);
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to remove warning if vip', async () => {
        let json = {
            issuerUserID: 'warning-vip',
            userID: 'warning-0',
            enabled: false
        };

        const res = await fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 200) {
            let row = await db.prepare('get', `SELECT "userID", "issueTime", "issuerUserID", enabled FROM warnings WHERE "userID" = ?`, [json.userID]);
            if (typeof row === 'undefined' || row.enabled != 0) {
                throw new Error("Warning missing from database");
            }
        } else {
            const body = await res.text();
            console.log(body);
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should not be able to create warning if not vip (exp 403)', async () => {
        let json = {
            issuerUserID: 'warning-not-vip',
            userID: 'warning-1',
        };

        const res = await fetch(getbaseURL()
            + "/api/warnUser", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status !== 403) {
            const body = await res.text();
            console.log(body);
            throw new Error("Status code was " + res.status);
        }
    });
});
