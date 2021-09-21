import fetch from "node-fetch";
import { getbaseURL, Done } from "../utils.js";
import { db } from "../../src/databases/databases.js";
import { getHash } from "../../src/utils/getHash.js";
import assert from "assert";

describe("getIsUserVIP", () => {
    before((done: Done) => {
        db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [getHash("supertestman")]).then(done);
    });

    it("Should be able to get a 200", (done: Done) => {
        fetch(`${getbaseURL()}/api/isUserVIP?userID=supertestman`)
            .then(res => {
                assert.strictEqual(res.status, 200, "response should be 200");
                done();
            })
            .catch(err => done(err));
    });


    it("Should get a 400 if no userID", (done: Done) => {
        fetch(`${getbaseURL()}/api/isUserVIP`)
            .then(res => {
                assert.strictEqual(res.status, 400, "response should be 400");
                done();
            })
            .catch(err => done(err));
    });

    it("Should say a VIP is a VIP", (done: Done) => {
        fetch(`${getbaseURL()}/api/isUserVIP?userID=supertestman`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.strictEqual(data.vip, true);
                done();
            })
            .catch(err => done(err));
    });

    it("Should say a normal user is not a VIP", (done: Done) => {
        fetch(`${getbaseURL()}/api/isUserVIP?userID=regulartestman`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.strictEqual(data.vip, false);
                done();
            })
            .catch(err => done(err));
    });
});
