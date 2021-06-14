import fetch from 'node-fetch';
import { Done, getbaseURL } from '../utils';
import { db } from '../../src/databases/databases';
import { getHash } from '../../src/utils/getHash';

const adminPrivateUserID = 'testUserId';
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
}

async function getUsername(userID: string) {
    const row = await db.prepare('get', 'SELECT "userName" FROM "userNames" WHERE userID = ?', [userID]);
    if (!row) {
        return null;
    }
    return row.userName;
}

describe('setUsername', () => {
    before(async () => {
        await addUsername(getHash(user01PrivateUserID), username01, 0);
        await addUsername(getHash(user02PrivateUserID), username02, 0);
        await addUsername(getHash(user03PrivateUserID), username03, 0);
        await addUsername(getHash(user04PrivateUserID), username04, 1);
        await addUsername(getHash(user05PrivateUserID), username05, 0);
        await addUsername(getHash(user06PrivateUserID), username06, 0);
        await addUsername(getHash(user07PrivateUserID), username07, 1);
    });

    it('Should return 200', (done: Done) => {
        fetch(`${getbaseURL()}/api/setUsername?userID=${user01PrivateUserID}&username=Changed%20Username`, {
            method: 'POST',
        })
        .then(res => {
            if (res.status !== 200) done(`Status code was ${res.status}`);
            else done(); // pass
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Should return 400 for missing param "userID"', (done: Done) => {
        fetch(`${getbaseURL()}/api/setUsername?username=MyUsername`, {
            method: 'POST',
        })
        .then(res => {
            if (res.status !== 400) done(`Status code was ${res.status}`);
            else done(); // pass
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Should return 400 for missing param "username"', (done: Done) => {
        fetch(`${getbaseURL()}/api/setUsername?userID=test`, {
            method: 'POST',
        })
        .then(res => {
            if (res.status !== 400) done(`Status code was ${res.status}`);
            else done(); // pass
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Should return 400 for "username" longer then 64 characters', (done: Done) => {
        const username65 = '0000000000000000000000000000000000000000000000000000000000000000X';
        fetch(`${getbaseURL()}/api/setUsername?userID=test&username=${encodeURIComponent(username65)}`, {
            method: 'POST',
        })
        .then(res => {
            if (res.status !== 400) done(`Status code was ${res.status}`);
            else  done(); // pass
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Should not change username if it contains "discord"', (done: Done) => {
        const newUsername = 'discord.me';
        fetch(`${getbaseURL()}/api/setUsername?userID=${user02PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        .then(async res => {
            if (res.status !== 200) done(`Status code was ${res.status}`);
            else {
                const userName = await getUsername(getHash(user02PrivateUserID));
                if (userName === newUsername) {
                    done(`Username '${username02}' got changed to '${newUsername}'`);
                }
                else done();
            }
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Should be able to change username', (done: Done) => {
        const newUsername = 'newUsername';
        fetch(`${getbaseURL()}/api/setUsername?userID=${user03PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        .then(async res => {
            const username = await getUsername(getHash(user03PrivateUserID));
            if (username !== newUsername) done(`Username did not change`);
            else done();
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Should not be able to change locked username', (done: Done) => {
        const newUsername = 'newUsername';
        fetch(`${getbaseURL()}/api/setUsername?userID=${user04PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        .then(async res => {
            const username = await getUsername(getHash(user04PrivateUserID));
            if (username === newUsername) done(`Username '${username04}' got changed to '${username}'`);
            else done();
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Should filter out unicode control characters', (done: Done) => {
        const newUsername = 'This\nUsername+has\tInvalid+Characters';
        fetch(`${getbaseURL()}/api/setUsername?userID=${user05PrivateUserID}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        .then(async res => {
            const username = await getUsername(getHash(user05PrivateUserID));
            if (username === newUsername) done(`Username contains unicode control characters`);
            else  done();
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Incorrect adminUserID should return 403', (done: Done) => {
        const newUsername = 'New Username';
        fetch(`${getbaseURL()}/api/setUsername?adminUserID=invalidAdminID&userID=${getHash(user06PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        .then(async res => {
            if (res.status !== 403) done(`Status code was ${res.status}`);
            else done();
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Admin should be able to change username', (done: Done) => {
        const newUsername = 'New Username';
        fetch(`${getbaseURL()}/api/setUsername?adminUserID=${adminPrivateUserID}&userID=${getHash(user06PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        .then(async res => {
            const username = await getUsername(getHash(user06PrivateUserID));
            if (username !== newUsername) done(`Failed to change username from '${username06}' to '${newUsername}'`);
            else done();
        })
        .catch(err => done(`couldn't call endpoint`));
    });

    it('Admin should be able to change locked username', (done: Done) => {
        const newUsername = 'New Username';
        fetch(`${getbaseURL()}/api/setUsername?adminUserID=${adminPrivateUserID}&userID=${getHash(user07PrivateUserID)}&username=${encodeURIComponent(newUsername)}`, {
            method: 'POST',
        })
        .then(async res => {
            const username = await getUsername(getHash(user06PrivateUserID));
            if (username !== newUsername) done(`Failed to change username from '${username06}' to '${newUsername}'`);
            else done();
        })
        .catch(err => done(`couldn't call endpoint`));
    });
});
