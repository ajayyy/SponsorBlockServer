import fetch from "node-fetch";
import {getbaseURL, Done} from "../utils";
import {db} from "../../src/databases/databases";
import {getHash} from "../../src/utils/getHash";
import assert from "assert";

describe("getIsUserVIP", () => {
    const endpoint = `${getbaseURL()}/api/isUserVIP`;
    before(() => {
        db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [getHash("isUserVIPVIP")]);
    });

    it("Should be able to get a 200", (done: Done) => {
        fetch(`${endpoint}?userID=isUserVIPVIP`)
            .then(res => {
                assert.strictEqual(res.status, 200, "response should be 200");
                done();
            })
            .catch(err => done(err));
    });


    it("Should get a 400 if no userID", (done: Done) => {
        fetch(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400, "response should be 400");
                done();
            })
            .catch(err => done(err));
    });

    it("Should say a VIP is a VIP", (done: Done) => {
        fetch(`${endpoint}?userID=isUserVIPVIP`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.strictEqual(data.vip, true);
                done();
            })
            .catch(err => done(err));
    });

    it("Should say a normal user is not a VIP", (done: Done) => {
        fetch(`${endpoint}?userID=isUserVIPNormal`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.strictEqual(data.vip, false);
                done();
            })
            .catch(err => done(err));
    });
});
