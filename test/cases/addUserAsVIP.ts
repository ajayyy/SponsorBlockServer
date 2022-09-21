import { getHash } from "../../src/utils/getHash";
import { HashedUserID } from "../../src/types/user.model";
import { client } from "../utils/httpClient";
import { db } from "../../src/databases/databases";
import assert from "assert";

// helpers
const checkUserVIP = (publicID: string) => db.prepare("get", `SELECT "userID" FROM "vipUsers" WHERE "userID" = ?`, [publicID]);

const adminPrivateUserID = "testUserId";
const permVIP1 = "addVIP_permaVIPOne";
const publicPermVIP1 = getHash(permVIP1) as HashedUserID;

const endpoint = "/api/addUserAsVIP";
const addUserAsVIP = (userID: string, enabled: boolean, adminUserID = adminPrivateUserID) => client({
    method: "POST",
    url: endpoint,
    params: {
        userID,
        adminUserID,
        enabled: String(enabled)
    }
});

describe("addVIP test", function() {
    it("User should not already be VIP", (done) => {
        checkUserVIP(publicPermVIP1)
            .then(result => {
                assert.ok(!result);
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to add user as VIP", (done) => {
        addUserAsVIP(publicPermVIP1, true)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await checkUserVIP(publicPermVIP1);
                assert.ok(row);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 403 with invalid adminID", (done) => {
        addUserAsVIP(publicPermVIP1, true, "Invalid_Admin_User_ID")
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 with missing adminID", (done) => {
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID: publicPermVIP1,
                enabled: String(true)
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 with missing userID", (done) => {
        client({
            method: "POST",
            url: endpoint,
            params: {
                enabled: String(true),
                adminUserID: adminPrivateUserID
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to remove VIP", (done) => {
        addUserAsVIP(publicPermVIP1, false)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await checkUserVIP(publicPermVIP1);
                assert.ok(!row);
                done();
            })
            .catch(err => done(err));
    });
});