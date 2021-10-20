import { db, privateDB } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

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

async function addUsername(userID: string, userName: string, locked = 0) {
    await db.prepare("run", 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)', [userID, userName, locked]);
    await addLogUserNameChange(userID, userName);
}

async function getUsernameInfo(userID: string): Promise<{ userName: string, locked: string }> {
    const row = await db.prepare("get", 'SELECT "userName", "locked" FROM "userNames" WHERE "userID" = ?', [userID]);
    if (!row) {
        return null;
    }
    return row;
}

function addLogUserNameChange(userID: string, newUserName: string, oldUserName = "") {
    privateDB.prepare("run",
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

async function testUserNameChangelog(userID: string, newUserName: string, oldUserName: string, byAdmin: boolean, done: Mocha.Done) {
    const log = await getLastLogUserNameChange(userID);
    assert.strictEqual(newUserName, log.newUserName);
    assert.strictEqual(oldUserName, log.oldUserName);
    assert.strictEqual(byAdmin, Boolean(log.updatedByAdmin));
    return done();
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
    });

    it("Should be able to set username that has never been set", (done) => {
        postSetUserName(user00PrivateUserID, username00)
            .then(async res => {
                const usernameInfo = await getUsernameInfo(getHash(user00PrivateUserID));
                assert.strictEqual(res.status, 200);
                assert.strictEqual(usernameInfo.userName, username00);
                assert.notStrictEqual(usernameInfo.locked, 1, "username should not be locked");
                done();
            })
            .catch((err) => done(err));
    });

    it("Should return 200", (done) => {
        const username = "Changed%20Username";
        postSetUserName(user01PrivateUserID, username)
            .then(res => {
                assert.strictEqual(res.status, 200);
                testUserNameChangelog(user01PrivateUserID, username, username01, false, done);
            })
            .catch((err) => done(err));
    });

    it('Should return 400 for missing param "userID"', (done) => {
        client({
            method: "POST",
            url: endpoint,
            data: {
                userName: "MyUsername"
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch((err) => done(err));
    });

    it('Should return 400 for missing param "username"', (done) => {
        client({
            method: "POST",
            url: endpoint,
            data: {
                userID: "test"
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch((err) => done(err));
    });

    it('Should return 400 for "username" longer then 64 characters', (done) => {
        const username65 = "0000000000000000000000000000000000000000000000000000000000000000X";
        postSetUserName("test", username65)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch((err) => done(err));
    });

    it('Should not change username if it contains "discord"', (done) => {
        const newUsername = "discord.me";
        postSetUserName(user02PrivateUserID, newUsername)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const userNameInfo = await getUsernameInfo(getHash(user02PrivateUserID));
                assert.notStrictEqual(userNameInfo.userName, newUsername);
                done();
            })
            .catch((err) => done(err));
    });

    it("Should be able to change username", (done) => {
        const newUsername = "newUsername";
        postSetUserName(user03PrivateUserID, newUsername)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user03PrivateUserID));
                assert.strictEqual(usernameInfo.userName, newUsername, "Username should change");
                assert.notStrictEqual(usernameInfo.locked, 1, "Username should not be locked");
                testUserNameChangelog(user03PrivateUserID, newUsername, username03, false, done);
            })
            .catch((err) => done(err));
    });

    it("Should not be able to change locked username", (done) => {
        const newUsername = "newUsername";
        postSetUserName(user04PrivateUserID, newUsername)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user04PrivateUserID));
                assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not be changed");
                assert.strictEqual(usernameInfo.locked, 1, "username should be locked");
                done();
            })
            .catch((err) => done(err));
    });

    it("Should filter out unicode control characters", (done) => {
        const newUsername = "This\nUsername+has\tInvalid+Characters";
        postSetUserName(user05PrivateUserID, newUsername)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user05PrivateUserID));
                assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not contain control characters");
                testUserNameChangelog(user05PrivateUserID, wellFormatUserName(newUsername), username05, false, done);
            })
            .catch((err) => done(err));
    });

    it("Incorrect adminUserID should return 403", (done) => {
        const newUsername = "New Username";
        postSetUserNameAdmin(getHash(user06PrivateUserID), newUsername,"invalidAdminID")
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch((err) => done(err));
    });

    it("Admin should be able to change username", (done) => {
        const newUsername = "New Username";
        postSetUserNameAdmin(getHash(user06PrivateUserID), newUsername, adminPrivateUserID)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
                assert.strictEqual(usernameInfo.userName, newUsername, "username should be changed");
                assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
                testUserNameChangelog(user06PrivateUserID, newUsername, username06, true, done);
            })
            .catch((err) => done(err));
    });

    it("Admin should be able to change locked username", (done) => {
        const newUsername = "New Username";
        postSetUserNameAdmin(getHash(user07PrivateUserID), newUsername, adminPrivateUserID)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
                assert.strictEqual(usernameInfo.userName, newUsername, "Username should be changed");
                assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
                testUserNameChangelog(user07PrivateUserID, newUsername, username07, true, done);
            })
            .catch((err) => done(err));
    });
});
