import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getUserID', () => {
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_01"), 'fuzzy user 01']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_02"), 'fuzzy user 02']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_03"), 'specific user 03']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_04"), 'repeating']);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_05"), 'repeating']);
    });

    it('Should be able to get a 200', (done: Done) => {
        fetch(getbaseURL() + '/api/userID?username=fuzzy+user+01')
        .then(async res => {
            const text = await res.text()
            if (res.status !== 200) done('non 200 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => done('couldn\'t call endpoint'));
    });

    it('Should be able to get a 400 (No username parameter)', (done: Done) => {
        fetch(getbaseURL() + '/api/userID')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => done('couldn\'t call endpoint'));
    });

    it('Should be able to get single username', (done: Done) => {
        fetch(getbaseURL() + '/api/userID?username=fuzzy+user+01')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 1) {
                    done('Returned incorrect number of users "' + data.length + '"');
                } else if (data[0].userName !== "fuzzy user 01") {
                    done('Returned incorrect username "' + data.userName + '"');
                } else if (data[0].userID !== getHash("getuserinfo_user_01")) {
                    done('Returned incorrect userID "' + data.userID + '"');
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should be able to get multiple fuzzy user info from start', (done: Done) => {
        fetch(getbaseURL() + '/api/userID?username=fuzzy+user')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 2) {
                    done('Returned incorrect number of users "' + data.length + '"');
                } else if (data[0].userName !== "fuzzy user 01") {
                    done('Returned incorrect username "' + data.userName + '"');
                } else if (data[0].userID !== getHash("getuserinfo_user_01")) {
                    done('Returned incorrect userID "' + data.userID + '"');
                } else if (data[1].userName !== "fuzzy user 02") {
                    done('Returned incorrect username "' + data.userName + '"');
                } else if (data[1].userID !== getHash("getuserinfo_user_02")) {
                    done('Returned incorrect userID "' + data.userID + '"');
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should be able to get multiple fuzzy user info from middle', (done: Done) => {
        fetch(getbaseURL() + '/api/userID?username=user')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 3) {
                    done('Returned incorrect number of users "' + data.length + '"');
                } else if (data[0].userName !== "fuzzy user 01") {
                    done('Returned incorrect username "' + data.userName + '"');
                } else if (data[0].userID !== getHash("getuserinfo_user_01")) {
                    done('Returned incorrect userID "' + data.userID + '"');
                } else if (data[1].userName !== "fuzzy user 02") {
                    done('Returned incorrect username "' + data.userName + '"');
                } else if (data[1].userID !== getHash("getuserinfo_user_02")) {
                    done('Returned incorrect userID "' + data.userID + '"');
                } else if (data[2].userName !== "specific user 03") {
                    done('Returned incorrect username "' + data.userName + '"');
                } else if (data[2].userID !== getHash("getuserinfo_user_03")) {
                    done('Returned incorrect userID "' + data.userID + '"');
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });
});
