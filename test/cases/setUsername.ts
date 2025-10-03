import { db, privateDB } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";
import { insertSegment } from "../utils/segmentQueryGen";
import { HashedUserID } from "../../src/types/user.model";

const adminPrivateUserID = "testUserId";
const user00PrivateUserID = "setUsername_00";
const username00 = "Username 00";
const user01PrivateUserID = "setUsername_01";
const username01 = "Username 01";
const user02PrivateUserID = "setUsername_02";
const username02 = "Username 02";
const user03PrivateUserID = "setUsername_03";
const username03 = "Username 03";
const user04PrivateUserID = "setUsername_04";
const username04 = "Username 04";
const user05PrivateUserID = "setUsername_05";
const username05 = "Username 05";
const user06PrivateUserID = "setUsername_06";
const username06 = "Username 06";
const user07PrivateUserID = "setUsername_07";
const username07 = "Username 07";
const user08PrivateUserID = "setUsername_08";
const user09PrivateUserID = "setUsername_09";
const completelyNewUsername = "Completely new user";
const completelyNewUserPrivId = "setUsername_completelyNew";

async function addUsername(userID: string, userName: string, locked = 0) {
    await db.prepare("run", 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)', [userID, userName, locked]);
    await addLogUserNameChange(userID, userName);
}

async function getUsernameInfo(userID: string): Promise<{ userName: string, locked: string}> {
    const row = await db.prepare("get", 'SELECT "userName", "locked" FROM "userNames" WHERE "userID" = ?', [userID]);
    if (!row) {
        throw new Error("No username found");
    }
    return row;
}

async function addLogUserNameChange(userID: string, newUserName: string, oldUserName = "") {
    await privateDB.prepare("run",
        `INSERT INTO "userNameLogs"("userID", "newUserName", "oldUserName", "updatedAt", "updatedByAdmin") VALUES(?, ?, ?, ?, ?)`,
        [getHash(userID), newUserName, oldUserName, new Date().getTime(), + true]
    );
}

function getLastLogUserNameChange(userID: string) {
    return privateDB.prepare("get", `SELECT * FROM "userNameLogs" WHERE "userID" = ? ORDER BY "updatedAt" DESC LIMIT 1`, [getHash(userID)]);
}

function wellFormatUserName(userName: string) {
    // eslint-disable-next-line no-control-regex
    return userName.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

async function testUserNameChangelog(userID: string, newUserName: string, oldUserName: string, byAdmin: boolean) {
    const log = await getLastLogUserNameChange(userID);
    assert.strictEqual(newUserName, log.newUserName);
    assert.strictEqual(oldUserName, log.oldUserName);
    assert.strictEqual(byAdmin, Boolean(log.updatedByAdmin));
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

const postSetUserNameAdmin = (userID: string, username: string, adminUserID: string) => client({
    method: "POST",
    url: endpoint,
    params: {
        userID,
        username,
        adminUserID,
    }
});

describe("setUsername", () => {
    before(async () => {
        await addUsername(getHash(user01PrivateUserID), username01, 0);
        await addUsername(getHash(user02PrivateUserID), username02, 0);
        await addUsername(getHash(user03PrivateUserID), username03, 0);
        await addUsername(getHash(user04PrivateUserID), username04, 1);
        await addUsername(getHash(user05PrivateUserID), username05, 0);
        await addUsername(getHash(user06PrivateUserID), username06, 0);
        await addUsername(getHash(user07PrivateUserID), username07, 1);
        await addUsername(getHash(user08PrivateUserID), "test", 0);

        for (const privId of [
            user00PrivateUserID,
            user01PrivateUserID,
            user02PrivateUserID,
            user03PrivateUserID,
            user04PrivateUserID,
            user05PrivateUserID,
            user06PrivateUserID,
            user07PrivateUserID,
            user08PrivateUserID,
            user09PrivateUserID,
        ]) {
            await insertSegment(db, { userID: getHash(privId) as HashedUserID });
        }
    });

    it("Should be able to set username that has never been set", async () => {
        const res = await postSetUserName(user00PrivateUserID, username00);
        const usernameInfo = await getUsernameInfo(getHash(user00PrivateUserID));
        assert.strictEqual(res.status, 200);
        assert.strictEqual(usernameInfo.userName, username00);
        assert.notStrictEqual(usernameInfo.locked, 1, "username should not be locked");
    });

    it("Should return 200", async () => {
        const username = "Changed%20Username";
        const res = await postSetUserName(user01PrivateUserID, username);
        assert.strictEqual(res.status, 200);
        await testUserNameChangelog(user01PrivateUserID, username, username01, false);
    });

    it('Should return 400 for missing param "userID"', async () => {
        const res = await client({
            method: "POST",
            url: endpoint,
            data: {
                userName: "MyUsername"
            }
        });
        assert.strictEqual(res.status, 400);
    });

    it('Should return 400 for missing param "username"', async () => {
        const res = await client({
            method: "POST",
            url: endpoint,
            data: {
                userID: "test"
            }
        });
        assert.strictEqual(res.status, 400);
    });

    it('Should return 400 for "username" longer then 64 characters', async () => {
        const username65 = "0000000000000000000000000000000000000000000000000000000000000000X";
        const res = await postSetUserName("test", username65);
        assert.strictEqual(res.status, 400);
    });

    it('Should not change username if it contains "discord"', async () => {
        const newUsername = "discord.me";
        const res = await postSetUserName(user02PrivateUserID, newUsername);
        assert.strictEqual(res.status, 200);
        const userNameInfo = await getUsernameInfo(getHash(user02PrivateUserID));
        assert.notStrictEqual(userNameInfo.userName, newUsername);
    });

    it("Should be able to change username", async () => {
        const newUsername = "newUsername";
        await postSetUserName(user03PrivateUserID, newUsername);
        const usernameInfo = await getUsernameInfo(getHash(user03PrivateUserID));
        assert.strictEqual(usernameInfo.userName, newUsername, "Username should change");
        assert.notStrictEqual(usernameInfo.locked, 1, "Username should not be locked");
        await testUserNameChangelog(user03PrivateUserID, newUsername, username03, false);
    });

    it("Should not be able to change locked username", async () => {
        const newUsername = "newUsername";
        await postSetUserName(user04PrivateUserID, newUsername);
        const usernameInfo = await getUsernameInfo(getHash(user04PrivateUserID));
        assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not be changed");
        assert.strictEqual(usernameInfo.locked, 1, "username should be locked");
    });

    it("Should filter out unicode control characters", async () => {
        const newUsername = "This\nUsername+has\tInvalid+Characters";
        await postSetUserName(user05PrivateUserID, newUsername);
        const usernameInfo = await getUsernameInfo(getHash(user05PrivateUserID));
        assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not contain control characters");
        await testUserNameChangelog(user05PrivateUserID, wellFormatUserName(newUsername), username05, false);
    });

    it("Incorrect adminUserID should return 403", async () => {
        const newUsername = "New Username";
        const res = await postSetUserNameAdmin(getHash(user06PrivateUserID), newUsername,"invalidAdminID");
        assert.strictEqual(res.status, 403);
    });

    it("Admin should be able to change username", async () => {
        const newUsername = "New Username";
        await postSetUserNameAdmin(getHash(user06PrivateUserID), newUsername, adminPrivateUserID);
        const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
        assert.strictEqual(usernameInfo.userName, newUsername, "username should be changed");
        assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
        await testUserNameChangelog(user06PrivateUserID, newUsername, username06, true);
    });

    it("Admin should be able to change locked username", async () => {
        const newUsername = "New Username";
        await postSetUserNameAdmin(getHash(user07PrivateUserID), newUsername, adminPrivateUserID);
        const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
        assert.strictEqual(usernameInfo.userName, newUsername, "Username should be changed");
        assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
        await testUserNameChangelog(user07PrivateUserID, newUsername, username07, true);
    });

    it("Should delete existing username if new username is same as publicID", async () => {
        const publicID = getHash(user08PrivateUserID);
        const resp = await postSetUserName(user08PrivateUserID, publicID);
        assert.strictEqual(resp.status, 200);
        await assert.rejects(getUsernameInfo(publicID), "Expected the username to be deleted");
    });

    it("Should silently reject username change if new username is same as publicID", async () => {
        const publicID = getHash(user09PrivateUserID);
        const resp = await postSetUserName(user09PrivateUserID, publicID);
        assert.strictEqual(resp.status, 200);
        await assert.rejects(getUsernameInfo(publicID), "Expected the username change to be silently rejected");
    });
});
