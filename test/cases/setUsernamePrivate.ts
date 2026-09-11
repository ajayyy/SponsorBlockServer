import assert from "assert";
import sinon from "sinon";

import { db } from "#databases/databases";
import { getHash } from "#utils/getHash";
import { config } from "#config";
import { HashedUserID } from "#types/user";

import { insertSegment } from "#test/utils/segmentQueryGen";
import { client } from "#test/utils/httpClient";

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


const addUsername = async (userID: string, userName: string, locked = 0) =>
    await db.prepare("run", 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)', [userID, userName, locked]);

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
        await addUsername(getHash(preExisting_underLimit), preExisting_underLimit, 0);
        await addUsername(getHash(preExisting_overLimit), preExisting_overLimit, 0);

        for (const privId of [
            preExisting_underLimit,
            preExisting_overLimit,
            newUser_underLimit,
            newUser_overLimit,
            otherUser
        ]) {
            await insertSegment(db, { userID: getHash(privId) as HashedUserID });
        }
    });
    // stub minUserIDLength
    before(() => sinon.stub(config, "minUserIDLength").value(USERID_LIMIT));
    after(() => sinon.restore());

    it("Existing privateID = username under Limit should retreive successfully", async () => {
        const privateID = preExisting_underLimit;
        assert.ok(await hasSetUsername(getHash(privateID)));
    });

    it("Existing privateID = username over Limit should retreive successfully", async () => {
        const privateID = preExisting_overLimit;
        assert.ok(await hasSetUsername(getHash(privateID)));
    });

    it("Should return error if trying to set userID = username under limit", async () => {
        const privateID = newUser_underLimit;
        const res = await postSetUserName(privateID, privateID);
        assert.strictEqual(res.status, 400);
        const usernameInfo = await hasSetUsername(getHash(privateID));
        assert.ok(!usernameInfo);
    });

    it("Should return error if trying to set username = other privateID over limit", async () => {
        const privateID = newUser_overLimit;
        const res = await postSetUserName(privateID, privateID);
        assert.strictEqual(res.status, 400);
        const usernameInfo = await hasSetUsername(getHash(privateID));
        assert.ok(!usernameInfo);
    });

    it("Should return error if trying to set username = other privateID over limit", async () => {
        const privateID = otherUser;
        const otherUserPrivate = preExisting_overLimit;
        const res = await postSetUserName(privateID, otherUserPrivate);
        assert.strictEqual(res.status, 400);
        const usernameInfo = await hasSetUsername(getHash(privateID));
        assert.ok(!usernameInfo);
    });

    it("Should not return error if trying to set username = other privateID under limit", async () => {
        const privateID = otherUser;
        const otherUserPrivate = preExisting_underLimit;
        const res = await postSetUserName(privateID, otherUserPrivate);
        assert.strictEqual(res.status, 200);
        const usernameInfo = await hasSetUsername(getHash(privateID));
        assert.ok(usernameInfo);
    });
});
