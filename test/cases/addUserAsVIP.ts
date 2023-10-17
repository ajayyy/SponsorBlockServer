import { HashedUserID } from "../../src/types/user.model";
import { client } from "../utils/httpClient";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { genAnonUser, genUsersProxy } from "../utils/genUser";

// helpers
const checkUserVIP = (publicID: string) => db.prepare("get", `SELECT "userID" FROM "vipUsers" WHERE "userID" = ?`, [publicID]);

const users = genUsersProxy("addUserAsVIP");

// hardcoded into test code
const adminPrivateUserID = "testUserId";

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

const testVIPUpdate = (target: HashedUserID, enabled: boolean, adminID: string = adminPrivateUserID) =>
    addUserAsVIP(target, enabled, adminID)
        .then(res => assert.strictEqual(res.status, 200))
        .then(() => checkUserVIP(target))
        .then(row => assert.ok(Boolean(row) == enabled));

const statusTest = (status: number, data: Record<string, any>) =>
    client({
        method: "POST",
        url: endpoint,
        params: data
    }).then(res => assert.strictEqual(res.status, status));

describe("addVIP test", function() {
    it("User should not already be VIP", () =>
        checkUserVIP(users["vip-1"].pubID)
            .then(result => assert.ok(!result))
    );
    it("Should be able to add user as VIP", () =>
        testVIPUpdate(users["vip-1"].pubID, true)
    );
    it("Should be able to remove VIP", () =>
        testVIPUpdate(users["vip-1"].pubID, false)
    );
    it("Should be able to add second user as VIP", () =>
        testVIPUpdate(genAnonUser().pubID, true)
    );
    it("Should return 403 with invalid adminID", () =>
        addUserAsVIP(genAnonUser().pubID, true, genAnonUser().privID)
            .then(res => assert.strictEqual(res.status, 403))
    );
    it("Should return 400 with missing adminID", () =>
        statusTest(400, {
            userID: genAnonUser().pubID,
            enabled: String(true)
        })
    );
    it("Should return 400 with missing userID", () =>
        statusTest(400, {
            enabled: String(true),
            adminUserID: adminPrivateUserID
        })
    );
    it("Should remove VIP if enabled is not true", () => {
        const user = genAnonUser();
        return testVIPUpdate(user.pubID, true)
            .then(() => statusTest(200, {
                userID: user.pubID,
                adminUserID: adminPrivateUserID,
                enabled: "invalid-text"
            }))
            .then(() => checkUserVIP(user.pubID))
            .then(row => assert.ok(!row));
    });
    it("Should remove VIP if enabled is missing", () => {
        const user = genAnonUser();
        return testVIPUpdate(user.pubID, true)
            .then(() => statusTest(200, {
                userID: user.pubID,
                adminUserID: adminPrivateUserID,
            }))
            .then(() => checkUserVIP(user.pubID))
            .then(row => assert.ok(!row));
    });
});