import fetch from "node-fetch";
import {Done, getbaseURL} from "../utils";
import {db} from "../../src/databases/databases";
import {getHash} from "../../src/utils/getHash";
import assert from "assert";

describe("postWarning", () => {
    before(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [getHash("warning-vip")]);
    });

    it("Should be able to create warning if vip (exp 200)", (done: Done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
            reason: "warning-reason-0"
        };
        fetch(`${getbaseURL()}/api/warnUser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "userID", "issueTime", "issuerUserID", enabled, "reason" FROM warnings WHERE "userID" = ?`, [json.userID]);
                assert.strictEqual(row.enabled, 1);
                assert.strictEqual(row.issuerUserID, getHash(json.issuerUserID));
                assert.strictEqual(row.reason, json.reason);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be not be able to create a duplicate warning if vip", (done: Done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
        };

        fetch(`${getbaseURL()}/api/warnUser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const row = await db.prepare("get", `SELECT "userID", "issueTime", "issuerUserID", enabled FROM warnings WHERE "userID" = ?`, [json.userID]);
                assert.strictEqual(row.enabled, 1);
                assert.strictEqual(row.issuerUserID, getHash(json.issuerUserID));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to remove warning if vip", (done: Done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
            enabled: false
        };

        fetch(`${getbaseURL()}/api/warnUser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "userID", "issueTime", "issuerUserID", enabled FROM warnings WHERE "userID" = ?`, [json.userID]);
                assert.strictEqual(row.enabled, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to create warning if not vip (exp 403)", (done: Done) => {
        const json = {
            issuerUserID: "warning-not-vip",
            userID: "warning-1",
        };

        fetch(`${getbaseURL()}/api/warnUser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });
});
