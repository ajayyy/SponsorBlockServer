import fetch from "node-fetch";
import { Done, getbaseURL } from "../utils";
import { db, privateDB } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";

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

async function addLogUserNameChange(userID: string, newUserName: string, oldUserName = "") {
    privateDB.prepare("run",
        `INSERT INTO "userNameLogs"("userID", "newUserName", "oldUserName", "updatedAt", "updatedByAdmin") VALUES(?, ?, ?, ?, ?)`,
        [getHash(userID), newUserName, oldUserName, new Date().getTime(), + true]
    );
}

async function getLastLogUserNameChange(userID: string) {
    return privateDB.prepare("get", `SELECT * FROM "userNameLogs" WHERE "userID" = ? ORDER BY "updatedAt" DESC LIMIT 1`, [getHash(userID)]);
}

function wellFormatUserName(userName: string) {
    // eslint-disable-next-line no-control-regex
    return userName.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

async function testUserNameChangelog(userID: string, newUserName: string, oldUserName: string, byAdmin: boolean, done: Done) {
    const log = await getLastLogUserNameChange(userID);
    assert.strictEqual(newUserName, log.newUserName);
    assert.strictEqual(oldUserName, log.oldUserName);
    assert.strictEqual(byAdmin, Boolean(log.updatedByAdmin));
    return done();
}

describe("setUsername", () => {
    const endpoint = `${getbaseURL()}/api/setUsername`;
    before(async () => {
        await addUsername(getHash(user01PrivateUserID), username01, 0);
        await addUsername(getHash(user02PrivateUserID), username02, 0);
        await addUsername(getHash(user03PrivateUserID), username03, 0);
        await addUsername(getHash(user04PrivateUserID), username04, 1);
        await addUsername(getHash(user05PrivateUserID), username05, 0);
        await addUsername(getHash(user06PrivateUserID), username06, 0);
        await addUsername(getHash(user07PrivateUserID), username07, 1);
    });

    it("Should be able to set username that has never been set", (done: Done) => {
        fetch(`${endpoint}?userID=${user00PrivateUserID}&username=${username00}`, {
            method: "POST",
        })
            .then(async res => {
                const usernameInfo = await getUsernameInfo(getHash(user00PrivateUserID));
                assert.strictEqual(res.status, 200);
                assert.strictEqual(usernameInfo.userName, username00);
                assert.notStrictEqual(usernameInfo.locked, 1, "username should not be locked");
                done();
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it("Should return 200", (done: Done) => {
        fetch(`${endpoint}?userID=${user01PrivateUserID}&username=Changed%20Username`, {
            method: "POST",
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                testUserNameChangelog(user01PrivateUserID, decodeURIComponent("Changed%20Username"), username01, false, done);
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it('Should return 400 for missing param "userID"', (done: Done) => {
        fetch(`${endpoint}?username=MyUsername`, {
            method: "POST",
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it('Should return 400 for missing param "username"', (done: Done) => {
        fetch(`${endpoint}?userID=test`, {
            method: "POST",
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it('Should return 400 for "username" longer then 64 characters', (done: Done) => {
        const username65 = "0000000000000000000000000000000000000000000000000000000000000000X";
        fetch(`${endpoint}?userID=test&username=${encodeURIComponent(username65)}`, {
            method: "POST",
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it('Should not change username if it contains "discord"', (done: Done) => {
        const newUsername = "discord.me";
        fetch(`${endpoint}?userID=${user02PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: "POST",
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const userNameInfo = await getUsernameInfo(getHash(user02PrivateUserID));
                assert.notStrictEqual(userNameInfo.userName, newUsername);
                done();
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it("Should be able to change username", (done: Done) => {
        const newUsername = "newUsername";
        fetch(`${endpoint}?userID=${user03PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: "POST",
        })
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user03PrivateUserID));
                assert.strictEqual(usernameInfo.userName, newUsername, "Username should change");
                assert.notStrictEqual(usernameInfo.locked, 1, "Username should not be locked");
                testUserNameChangelog(user03PrivateUserID, newUsername, username03, false, done);
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it("Should not be able to change locked username", (done: Done) => {
        const newUsername = "newUsername";
        fetch(`${endpoint}?userID=${user04PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: "POST",
        })
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user04PrivateUserID));
                assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not be changed");
                assert.strictEqual(usernameInfo.locked, 1, "username should be locked");
                done();
            })
            .catch((err) => done(`couldn't call endpoint: ${err}`));
    });

    it("Should filter out unicode control characters", (done: Done) => {
        const newUsername = "This\nUsername+has\tInvalid+Characters";
        fetch(`${endpoint}?userID=${user05PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: "POST",
        })
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user05PrivateUserID));
                assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not contain control characters");
                testUserNameChangelog(user05PrivateUserID, wellFormatUserName(newUsername), username05, false, done);
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it("Incorrect adminUserID should return 403", (done: Done) => {
        const newUsername = "New Username";
        fetch(`${endpoint}?adminUserID=invalidAdminID&userID=${getHash(user06PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: "POST",
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it("Admin should be able to change username", (done: Done) => {
        const newUsername = "New Username";
        fetch(`${endpoint}?adminUserID=${adminPrivateUserID}&userID=${getHash(user06PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: "POST",
        })
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
                assert.strictEqual(usernameInfo.userName, newUsername, "username should be changed");
                assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
                testUserNameChangelog(user06PrivateUserID, newUsername, username06, true, done);
            })
            .catch(() => done(`couldn't call endpoint`));
    });

    it("Admin should be able to change locked username", (done: Done) => {
        const newUsername = "New Username";
        fetch(`${endpoint}?adminUserID=${adminPrivateUserID}&userID=${getHash(user07PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: "POST",
        })
            .then(async () => {
                const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
                assert.strictEqual(usernameInfo.userName, newUsername, "Username should be changed");
                assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
                testUserNameChangelog(user07PrivateUserID, newUsername, username07, true, done);
            })
            .catch(() => done(`couldn't call endpoint`));
    });
});
