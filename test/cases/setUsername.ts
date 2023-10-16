import { db, privateDB } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { UsernameUser, genAnonUser, genUsersUsername } from "../utils/genUser";
import { genRandomValue } from "../utils/getRandom";

const adminPrivateUserID = "testUserId"; // hardcoded

const userMap = new Map();
// generate usermap from 00 to 08
for (let i = 0; i < 9; i++) {
    userMap.set(`user_0${i}`, `username_0${i}`);
}

const users = genUsersUsername("setUsername", userMap);

async function addUsername(user: UsernameUser, locked = 0) {
    await db.prepare("run", 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)', [user.pubID, user.username, locked]);
    await addLogUserNameChange(user.pubID, user.username);
}

async function getUsernameInfo(publicUserID: string): Promise<{ userName: string, locked: string}> {
    const row = await db.prepare("get", 'SELECT "userName", "locked" FROM "userNames" WHERE "userID" = ?', [publicUserID]);
    if (!row) {
        throw new Error("No username found");
    }
    return row;
}

function addLogUserNameChange(publicUserID: string, newUserName: string, oldUserName = "") {
    privateDB.prepare("run",
        `INSERT INTO "userNameLogs"("userID", "newUserName", "oldUserName", "updatedAt", "updatedByAdmin") VALUES(?, ?, ?, ?, ?)`,
        [publicUserID, newUserName, oldUserName, new Date().getTime(), + true]
    );
}

function getLastLogUserNameChange(publicUserID: string) {
    return privateDB.prepare("get", `SELECT * FROM "userNameLogs" WHERE "userID" = ? ORDER BY "updatedAt" DESC LIMIT 1`, [publicUserID]);
}

function wellFormatUserName(userName: string) {
    // eslint-disable-next-line no-control-regex
    return userName.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

async function testUserNameChangelog(publicUserID: string, newUserName: string, oldUserName: string, byAdmin: boolean, done: Mocha.Done) {
    const log = await getLastLogUserNameChange(publicUserID);
    assert.strictEqual(newUserName, log.newUserName);
    assert.strictEqual(oldUserName, log.oldUserName);
    assert.strictEqual(byAdmin, Boolean(log.updatedByAdmin));
    return done();
}

const endpoint = "/api/setUsername";
const postSetUserName = (privateUserID: string, username: string) => client({
    method: "POST",
    url: endpoint,
    params: {
        userID: privateUserID,
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
        // skip user0
        // add unlocked users
        await addUsername(users["user_01"], 0);
        await addUsername(users["user_02"], 0);
        await addUsername(users["user_03"], 0);
        await addUsername(users["user_05"], 0);
        await addUsername(users["user_06"], 0);
        await addUsername(users["user_08"], 0);
        // add locked users
        await addUsername(users["user_04"], 1);
        await addUsername(users["user_07"], 1);
    });

    it("Should be able to set username that has never been set", (done) => {
        const user = users["user_00"];
        postSetUserName(user.privID, user.username)
            .then(async res => {
                const usernameInfo = await getUsernameInfo(user.pubID);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(usernameInfo.userName, user.username);
                assert.notStrictEqual(usernameInfo.locked, 1, "username should not be locked");
                done();
            })
            .catch((err) => done(err));
    });

    it("Should return 200", (done) => {
        const user = users["user_01"];
        const newUsername = genRandomValue("username", "setUsername01");
        postSetUserName(user.privID, newUsername)
            .then(res => {
                assert.strictEqual(res.status, 200);
                testUserNameChangelog(user.pubID, newUsername, user.username, false, done);
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
        const username65 = "0".repeat(65);
        postSetUserName(genAnonUser().privID, username65)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch((err) => done(err));
    });

    it('Should not change username if it contains "discord"', (done) => {
        const newUsername = "discord.me";
        const user = users["user_02"];
        postSetUserName(user.privID, newUsername)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const userNameInfo = await getUsernameInfo(user.pubID);
                assert.notStrictEqual(userNameInfo.userName, newUsername);
                done();
            })
            .catch((err) => done(err));
    });

    it("Should be able to change username", (done) => {
        const newUsername = "newUsername";
        const user = users["user_03"];
        postSetUserName(user.privID, newUsername)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(user.pubID);
                assert.strictEqual(usernameInfo.userName, newUsername, "Username should change");
                assert.notStrictEqual(usernameInfo.locked, 1, "Username should not be locked");
                testUserNameChangelog(user.pubID, newUsername, user.username, false, done);
            })
            .catch((err) => done(err));
    });

    it("Should not be able to change locked username", (done) => {
        const newUsername = "newUsername";
        const user = users["user_04"];
        postSetUserName(user.privID, newUsername)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(user.pubID);
                assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not be changed");
                assert.strictEqual(usernameInfo.locked, 1, "username should be locked");
                done();
            })
            .catch((err) => done(err));
    });

    it("Should filter out unicode control characters", (done) => {
        const newUsername = "This\nUsername+has\tInvalid+Characters";
        const user = users["user_05"];
        postSetUserName(user.privID, newUsername)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(user.pubID);
                assert.notStrictEqual(usernameInfo.userName, newUsername, "Username should not contain control characters");
                testUserNameChangelog(user.pubID, wellFormatUserName(newUsername), user.username, false, done);
            })
            .catch((err) => done(err));
    });

    it("Incorrect adminUserID should return 403", (done) => {
        const newUsername = "New Username";
        const user = users["user_06"];
        const adminID = genRandomValue("adminID", "setUsername06");
        postSetUserNameAdmin(user.pubID, newUsername, adminID)
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch((err) => done(err));
    });

    it("Admin should be able to change username", (done) => {
        const newUsername = "New Username";
        const user = users["user_06"];
        postSetUserNameAdmin(user.pubID, newUsername, adminPrivateUserID)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(user.pubID);
                assert.strictEqual(usernameInfo.userName, newUsername, "username should be changed");
                assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
                testUserNameChangelog(user.pubID, newUsername, user.username, true, done);
            })
            .catch((err) => done(err));
    });

    it("Admin should be able to change locked username", (done) => {
        const newUsername = "New Username";
        const user = users["user_07"];
        postSetUserNameAdmin(user.pubID, newUsername, adminPrivateUserID)
            .then(async () => {
                const usernameInfo = await getUsernameInfo(user.pubID);
                assert.strictEqual(usernameInfo.userName, newUsername, "Username should be changed");
                assert.strictEqual(usernameInfo.locked, 1, "Username should be locked");
                testUserNameChangelog(user.pubID, newUsername, user.username, true, done);
            })
            .catch((err) => done(err));
    });

    it("Should delete row if new username is same as publicID", (done) => {
        const user = users["user_08"];
        postSetUserName(user.privID, user.pubID)
            .then(() => {
                getUsernameInfo(user.pubID)
                    .then(usernameinfo => done(`Username should be deleted - ${JSON.stringify(usernameinfo)})`))
                    .catch(() => done());
            })
            .catch((err) => done(err));
    });
});
