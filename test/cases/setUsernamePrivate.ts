import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";
import { config } from "../../src/config";
import sinon from "sinon";

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
    });
    // stub minUserIDLength
    before(() => sinon.stub(config, "minUserIDLength").value(USERID_LIMIT));
    after(() => sinon.restore());

    it("Existing privateID = username under Limit should retreive successfully", (done) => {
        const privateID = preExisting_underLimit;
        hasSetUsername(getHash(privateID))
            .then((usernameInfo) => {
                assert.ok(usernameInfo);
                done();
            });
    });

    it("Existing privateID = username over Limit should retreive successfully", (done) => {
        const privateID = preExisting_overLimit;
        hasSetUsername(getHash(privateID))
            .then((usernameInfo) => {
                assert.ok(usernameInfo);
                done();
            });
    });

    it("Should return error if trying to set userID = username under limit", (done) => {
        const privateID = newUser_underLimit;
        postSetUserName(privateID, privateID)
            .then(async (res) => {
                assert.strictEqual(res.status, 400);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(!usernameInfo);
                done();
            })
            .catch((err) => done(err));
    });

    it("Should return error if trying to set username = other privateID over limit", (done) => {
        const privateID = newUser_overLimit;
        postSetUserName(privateID, privateID)
            .then(async (res) => {
                assert.strictEqual(res.status, 400);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(!usernameInfo);
                done();
            })
            .catch((err) => done(err));
    });

    it("Should return error if trying to set username = other privateID over limit", (done) => {
        const privateID = otherUser;
        const otherUserPrivate = preExisting_overLimit;
        postSetUserName(privateID, otherUserPrivate)
            .then(async (res) => {
                assert.strictEqual(res.status, 400);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(!usernameInfo);
                done();
            })
            .catch((err) => done(err));
    });

    it("Should not return error if trying to set username = other privateID under limit", (done) => {
        const privateID = otherUser;
        const otherUserPrivate = preExisting_underLimit;
        postSetUserName(privateID, otherUserPrivate)
            .then(async (res) => {
                assert.strictEqual(res.status, 200);
                const usernameInfo = await hasSetUsername(getHash(privateID));
                assert.ok(usernameInfo);
                done();
            })
            .catch((err) => done(err));
    });
});
