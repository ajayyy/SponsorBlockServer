import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import { client } from "../utils/httpClient";
import assert from "assert";

const VIPUser = "isUserVIPVIP";
const normalUser = "isUserVIPNormal";
const endpoint = "/api/isUserVIP";
const vipUserRequest = (userID: string) => client.get(endpoint, { params: { userID } });

describe("getIsUserVIP", () => {
    before(() => {
        db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [getHash(VIPUser)]);
    });

    it("Should be able to get a 200", (done) => {
        vipUserRequest(VIPUser)
            .then(res => {
                assert.strictEqual(res.status, 200, "response should be 200");
                done();
            })
            .catch(err => done(err));
    });


    it("Should get a 400 if no userID", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400, "response should be 400");
                done();
            })
            .catch(err => done(err));
    });

    it("Should say a VIP is a VIP", (done) => {
        vipUserRequest(VIPUser)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.vip, true);
                done();
            })
            .catch(err => done(err));
    });

    it("Should say a normal user is not a VIP", (done) => {
        vipUserRequest(normalUser)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.vip, false);
                done();
            })
            .catch(err => done(err));
    });
});
