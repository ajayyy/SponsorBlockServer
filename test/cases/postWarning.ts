import fetch from "node-fetch";
import { Done, getbaseURL, partialDeepEquals } from "../utils";
import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
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
                const expected = {
                    enabled: 1,
                    issuerUserID: getHash(json.issuerUserID),
                    reason: json.reason,
                };
                assert.ok(partialDeepEquals(row, expected));
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
                const expected = {
                    enabled: 1,
                    issuerUserID: getHash(json.issuerUserID),
                };
                assert.ok(partialDeepEquals(row, expected));
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
                const expected = {
                    enabled: 0
                };
                assert.ok(partialDeepEquals(row, expected));
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

    it("Should return 400 if missing body", (done: Done) => {
        fetch(`${getbaseURL()}/api/warnUser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should re-enable disabled warning", (done: Done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
            enabled: true
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
                const data = await db.prepare("get", `SELECT "userID", "issueTime", "issuerUserID", enabled FROM warnings WHERE "userID" = ?`, [json.userID]);
                const expected = {
                    enabled: 1
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });
});
