import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

describe("postWarning", () => {
    // constants
    const endpoint = "/api/warnUser";
    const getWarning = (userID: string) => db.prepare("get", `SELECT "userID", "issueTime", "issuerUserID", enabled, "reason" FROM warnings WHERE "userID" = ?`, [userID]);

    before(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [getHash("warning-vip")]);
    });

    it("Should be able to create warning if vip (exp 200)", (done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
            reason: "warning-reason-0"
        };
        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
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

    it("Should be not be able to create a duplicate warning if vip", (done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 1,
                    issuerUserID: getHash(json.issuerUserID),
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to remove warning if vip", (done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
            enabled: false
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 0
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to create warning if not vip (exp 403)", (done) => {
        const json = {
            issuerUserID: "warning-not-vip",
            userID: "warning-1",
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if missing body", (done) => {
        client.post(endpoint, {})
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should re-enable disabled warning", (done) => {
        const json = {
            issuerUserID: "warning-vip",
            userID: "warning-0",
            enabled: true
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await getWarning(json.userID);
                const expected = {
                    enabled: 1
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });
});
