import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";
import { config } from "../../src/config";
import sinon from "sinon";
import { insertUsername } from "../utils/queryGen";
import { HashedUserID } from "../../src/types/user.model";

const USERID_LIMIT = 30;

// preexisting username with userid < Limit
const preExisting_underLimit = "preExisting_under";
// preexisting username with userid > Limit
const preExisting_overLimit = `preExisting_over${"*".repeat(USERID_LIMIT)}`;
// new username to privateID < Limit
const newUser_underLimit = "newUser_under";
// new username to privateID > Limit
const newUser_overLimit = `newUser_over${"*".repeat(USERID_LIMIT)}`;
// new username to someone else'e privateID
const otherUser = `otherUser${"*".repeat(USERID_LIMIT)}`;

async function hasSetUsername(userID: string): Promise<boolean> {
    const row = await db.prepare("get", 'SELECT "userName", "locked" FROM "userNames" WHERE "userID" = ?', [userID]);
    return Boolean(row);
}

const endpoint = "/api/setUsername";
const postSetUserName = (userID: string, username: string) => client({
    method: "POST",
    url: endpoint,
    params: {
        userID,
        username,
    }
});

describe("setUsernamePrivate tests", () => {
    // add preexisitng usernames
    before(async () => {
        await insertUsername(db, getHash(preExisting_underLimit) as HashedUserID, preExisting_underLimit);
        await insertUsername(db, getHash(preExisting_overLimit) as HashedUserID, preExisting_overLimit);
    });
    // stub minUserIDLength
    before(() => sinon.stub(config, "minUserIDLength").value(USERID_LIMIT));
    after(() => sinon.restore());

    it("Existing privateID = username under Limit should retreive successfully", () => {
        const privateID = preExisting_underLimit;
        hasSetUsername(getHash(privateID))
            .then((usernameInfo) => {
                assert.ok(usernameInfo);
            });
    });

    it("Existing privateID = username over Limit should retreive successfully", () => {
        const privateID = preExisting_overLimit;
        hasSetUsername(getHash(privateID))
            .then((usernameInfo) => {
                assert.ok(usernameInfo);
            });
    });

    it("Should return error if trying to set userID = username under limit", () => {
        const privateID = newUser_underLimit;
        return postSetUserName(privateID, privateID)
            .then(async (res) => {
                assert.strictEqual(res.status, 400);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(!usernameInfo);
            });
    });

    it("Should return error if trying to set username = other privateID over limit", () => {
        const privateID = newUser_overLimit;
        return postSetUserName(privateID, privateID)
            .then(async (res) => {
                assert.strictEqual(res.status, 400);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(!usernameInfo);
            });
    });

    it("Should return error if trying to set username = other privateID over limit", () => {
        const privateID = otherUser;
        const otherUserPrivate = preExisting_overLimit;
        return postSetUserName(privateID, otherUserPrivate)
            .then(async (res) => {
                assert.strictEqual(res.status, 400);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(!usernameInfo);
            });
    });

    it("Should not return error if trying to set username = other privateID under limit", () => {
        const privateID = otherUser;
        const otherUserPrivate = preExisting_underLimit;
        return postSetUserName(privateID, otherUserPrivate)
            .then(async (res) => {
                assert.strictEqual(res.status, 200);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(usernameInfo);
            });
    });
});
