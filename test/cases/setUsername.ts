import fetch from 'node-fetch';
import { getbaseURL } from '../utils';
import { getHash } from '../../src/utils/getHash';
import {IDatabase} from "../../src/databases/IDatabase";

declare const db: IDatabase
declare const privateDB: IDatabase

const adminPrivateUserID = 'testUserId';
const user00PrivateUserID = 'setUsername_00';
const username00 = 'Username 00';
const user01PrivateUserID = 'setUsername_01';
const username01 = 'Username 01';
const user02PrivateUserID = 'setUsername_02';
const username02 = 'Username 02';
const user03PrivateUserID = 'setUsername_03';
const username03 = 'Username 03';
const user04PrivateUserID = 'setUsername_04';
const username04 = 'Username 04';
const user05PrivateUserID = 'setUsername_05';
const username05 = 'Username 05';
const user06PrivateUserID = 'setUsername_06';
const username06 = 'Username 06';
const user07PrivateUserID = 'setUsername_07';
const username07 = 'Username 07';

async function addUsername(userID: string, userName: string, locked = 0) {
    await db.prepare('run', 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)', [userID, userName, locked]);
    await addLogUserNameChange(userID, userName);
}

async function getUsernameInfo(userID: string): Promise<{ userName: string, locked: string }> {
    const row = await db.prepare('get', 'SELECT "userName", "locked" FROM "userNames" WHERE "userID" = ?', [userID]);
    if (!row) {
        return null;
    }
    return row;
}

async function addLogUserNameChange(userID: string, newUserName: string, oldUserName: string = '') {
    privateDB.prepare('run',
        `INSERT INTO "userNameLogs"("userID", "newUserName", "oldUserName", "updatedAt", "updatedByAdmin") VALUES(?, ?, ?, ?, ?)`,
        [getHash(userID), newUserName, oldUserName, new Date().getTime(), + true]
    );
}

async function getLastLogUserNameChange(userID: string) {
    return privateDB.prepare('get', `SELECT * FROM "userNameLogs" WHERE "userID" = ? ORDER BY "updatedAt" DESC LIMIT 1`, [getHash(userID)]);
}

function wellFormatUserName(userName: string) {
    return userName.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

async function testUserNameChangelog(userID: string, newUserName: string, oldUserName: string, byAdmin: boolean) {

    const log = await getLastLogUserNameChange(userID);

    if (newUserName !== log.newUserName) {
        throw new Error(`UserID '${userID}' incorrect log on newUserName: ${newUserName} !== ${log.newUserName}`);
    }

    if (oldUserName !== log.oldUserName) {
        throw new Error(`UserID '${userID}' incorrect log on oldUserName: ${oldUserName} !== ${log.oldUserName}`);
    }

    if (byAdmin !== Boolean(log.updatedByAdmin)) {
        throw new Error(`UserID '${userID}' incorrect log on updatedByAdmin: ${byAdmin} !== ${log.updatedByAdmin}`);
    }
}

describe('setUsername', () => {
    beforeAll(async () => {
        await addUsername(getHash(user01PrivateUserID), username01, 0);
        await addUsername(getHash(user02PrivateUserID), username02, 0);
        await addUsername(getHash(user03PrivateUserID), username03, 0);
        await addUsername(getHash(user04PrivateUserID), username04, 1);
        await addUsername(getHash(user05PrivateUserID), username05, 0);
        await addUsername(getHash(user06PrivateUserID), username06, 0);
        await addUsername(getHash(user07PrivateUserID), username07, 1);
    });

    it('Should be able to set username that has never been set', async () => {
        const res = await fetch(`${getbaseURL()}/api/setUsername?userID=${user00PrivateUserID}&username=${username00}`, {
            method: 'POST',
        })
        const usernameInfo = await getUsernameInfo(getHash(user00PrivateUserID));
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        if (usernameInfo.userName !== username00) throw new Error(`Username did not change. Currently is ${usernameInfo.userName}`);
        if (usernameInfo.locked == "1") throw new Error(`Username was locked when it shouldn't have been`);
    });

    it('Should return 200', async () => {
        const res = await fetch(`${getbaseURL()}/api/setUsername?userID=${user01PrivateUserID}&username=Changed%20Username`, {
            method: 'POST',
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        else {
            await testUserNameChangelog(user01PrivateUserID, decodeURIComponent('Changed%20Username'), username01, false);
        }
    });

    it('Should return 400 for missing param "userID"', async () => {
        const res = await fetch(`${getbaseURL()}/api/setUsername?username=MyUsername`, {
            method: 'POST',
        })
        if (res.status !== 400) throw new Error(`Status code was ${res.status}`);
    });

    it('Should return 400 for missing param "username"', async () => {
        const res = await fetch(`${getbaseURL()}/api/setUsername?userID=test`, {
            method: 'POST',
        })
        if (res.status !== 400) throw new Error(`Status code was ${res.status}`);
    });

    it('Should return 400 for "username" longer then 64 characters', async () => {
        const username65 = '0000000000000000000000000000000000000000000000000000000000000000X';
        const res = await fetch(`${getbaseURL()}/api/setUsername?userID=test&username=${encodeURIComponent(username65)}`, {
            method: 'POST',
        })
        if (res.status !== 400) throw new Error(`Status code was ${res.status}`);
    });

    it('Should not change username if it contains "discord"', async () => {
        const newUsername = 'discord.me';
        const res = await fetch(`${getbaseURL()}/api/setUsername?userID=${user02PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        else {
            const userNameInfo = await getUsernameInfo(getHash(user02PrivateUserID));
            if (userNameInfo.userName === newUsername) {
                throw new Error(`Username '${username02}' got changed to '${newUsername}'`);
            }
        }
    });

    it('Should be able to change username', async () => {
        const newUsername = 'newUsername';
        await fetch(`${getbaseURL()}/api/setUsername?userID=${user03PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        const usernameInfo = await getUsernameInfo(getHash(user03PrivateUserID));
        if (usernameInfo.userName !== newUsername) throw new Error(`Username did not change`);
        if (usernameInfo.locked == "1") throw new Error(`Username was locked when it shouldn't have been`);
        await testUserNameChangelog(user03PrivateUserID, newUsername, username03, false);
    });

    it('Should not be able to change locked username', async () => {
        const newUsername = 'newUsername';
        await fetch(`${getbaseURL()}/api/setUsername?userID=${user04PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        const usernameInfo = await getUsernameInfo(getHash(user04PrivateUserID));
        if (usernameInfo.userName === newUsername) throw new Error(`Username '${username04}' got changed to '${usernameInfo}'`);
        if (usernameInfo.locked == "0") throw new Error(`Username was unlocked when it shouldn't have been`);
    });

    it('Should filter out unicode control characters', async () => {
        const newUsername = 'This\nUsername+has\tInvalid+Characters';
        await fetch(`${getbaseURL()}/api/setUsername?userID=${user05PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        const usernameInfo = await getUsernameInfo(getHash(user05PrivateUserID));
        if (usernameInfo.userName === newUsername) throw new Error(`Username contains unicode control characters`);
        else await testUserNameChangelog(user05PrivateUserID, wellFormatUserName(newUsername), username05, false);
    });

    it('Incorrect adminUserID should return 403', async () => {
        const newUsername = 'New Username';
        const res = await fetch(`${getbaseURL()}/api/setUsername?adminUserID=invalidAdminID&userID=${getHash(user06PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        if (res.status !== 403) throw new Error(`Status code was ${res.status}`);
    });

    it('Admin should be able to change username', async () => {
        const newUsername = 'New Username';
        await fetch(`${getbaseURL()}/api/setUsername?adminUserID=${adminPrivateUserID}&userID=${getHash(user06PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
        if (usernameInfo.userName !== newUsername) throw new Error(`Failed to change username from '${username06}' to '${newUsername}'`);
        if (usernameInfo.locked == "0") throw new Error(`Username was not locked`);
        else await testUserNameChangelog(user06PrivateUserID, newUsername, username06, true);
    });

    it('Admin should be able to change locked username', async () => {
        const newUsername = 'New Username';
        await fetch(`${getbaseURL()}/api/setUsername?adminUserID=${adminPrivateUserID}&userID=${getHash(user07PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        const usernameInfo = await getUsernameInfo(getHash(user06PrivateUserID));
        if (usernameInfo.userName !== newUsername) throw new Error(`Failed to change username from '${username06}' to '${newUsername}'`);
        if (usernameInfo.locked == "0") throw new Error(`Username was unlocked when it shouldn't have been`);
        else await testUserNameChangelog(user07PrivateUserID, newUsername, username07, true);
    });
});
