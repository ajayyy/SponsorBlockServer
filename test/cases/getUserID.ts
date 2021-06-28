import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {IDatabase} from "../../src/databases/IDatabase";

declare const db: IDatabase

describe('getUserID', () => {
    beforeAll(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_01"), 'fuzzy user 01']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_02"), 'fuzzy user 02']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_03"), 'specific user 03']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_04"), 'repeating']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_05"), 'repeating']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_06"), getHash("getuserid_user_06")]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_07"), '0redos0']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_08"), '%redos%']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_09"), '_redos_']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_10"), 'redos\\%']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_11"), '\\\\\\']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_12"), 'a']);
    });

    it('Should be able to get a 200', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=fuzzy+user+01')
        if (res.status !== 200) throw new Error('non 200 (' + res.status + ')');
    });

    it('Should be able to get a 400 (No username parameter)', async () => {
        const res = await fetch(getbaseURL() + '/api/userID')
        if (res.status !== 400) throw new Error('non 400 (' + res.status + ')');
    });

    it('Should be able to get a 200 (username is public id)', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username='+getHash("getuserid_user_06"))
        if (res.status !== 200) throw new Error('non 200 (' + res.status + ')');
    });

    it('Should be able to get a 400 (username longer than 64 chars)', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username='+getHash("getuserid_user_06")+'0')
        if (res.status !== 400) throw new Error('non 400 (' + res.status + ')');
    });

    it('Should be able to get single username', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=fuzzy+user+01')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 1) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "fuzzy user 01") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_01")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should be able to get multiple fuzzy user info from start', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=fuzzy+user')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 2) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "fuzzy user 01") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_01")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[1].userName !== "fuzzy user 02") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[1].userID !== getHash("getuserid_user_02")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should be able to get multiple fuzzy user info from middle', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=user')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 3) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "fuzzy user 01") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_01")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[1].userName !== "fuzzy user 02") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[1].userID !== getHash("getuserid_user_02")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[2].userName !== "specific user 03") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[2].userID !== getHash("getuserid_user_03")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should be able to get with public ID', async () => {
        const userID = getHash("getuserid_user_06");
        const res = await fetch(getbaseURL() + '/api/userID?username='+userID)
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 1) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== userID) {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== userID) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should be able to get with fuzzy public ID', async () => {
        const userID = getHash("getuserid_user_06");
        const res = await fetch(getbaseURL() + '/api/userID?username='+userID.substr(10,60))
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 1) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== userID) {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== userID) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should be able to get repeating username', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=repeating')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 2) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "repeating") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_04")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[1].userName !== "repeating") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[1].userID !== getHash("getuserid_user_05")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should be able to get repeating fuzzy username', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=peat')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 2) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "repeating") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_04")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[1].userName !== "repeating") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[1].userID !== getHash("getuserid_user_05")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('should avoid ReDOS with _', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=_redos_')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 1) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "_redos_") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_09")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('should avoid ReDOS with %', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=%redos%')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 1) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "%redos%") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_08")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('should return 404 if escaped backslashes present', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=%redos\\\\_')
        if (res.status !== 404) throw new Error('non 404 (' + res.status + ')');
    });

    it('should return 404 if backslashes present', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=\\%redos\\_')
        if (res.status !== 404) throw new Error('non 404 (' + res.status + ')');
    });

    it('should return user if just backslashes', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=\\\\\\')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 1) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "\\\\\\") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_11")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('should not allow usernames more than 64 characters', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username='+'0'.repeat(65))
        if (res.status !== 400) throw new Error('non 400 (' + res.status + ')');
    });

    it('should not allow usernames less than 3 characters', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=aa')
        if (res.status !== 400) throw new Error('non 400 (' + res.status + ')');
    });

    it('should allow exact match', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=a&exact=true')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 1) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "a") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_12")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should be able to get repeating username with exact username', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=repeating&exact=true')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 2) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "repeating") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_04")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[1].userName !== "repeating") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[1].userID !== getHash("getuserid_user_05")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });

    it('Should not get exact unless explicitly set to true', async () => {
        const res = await fetch(getbaseURL() + '/api/userID?username=user&exact=1')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.length !== 3) {
                throw new Error('Returned incorrect number of users "' + data.length + '"');
            } else if (data[0].userName !== "fuzzy user 01") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[0].userID !== getHash("getuserid_user_01")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[1].userName !== "fuzzy user 02") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[1].userID !== getHash("getuserid_user_02")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            } else if (data[2].userName !== "specific user 03") {
                throw new Error('Returned incorrect username "' + data.userName + '"');
            } else if (data[2].userID !== getHash("getuserid_user_03")) {
                throw new Error('Returned incorrect userID "' + data.userID + '"');
            }
        }
    });
});
