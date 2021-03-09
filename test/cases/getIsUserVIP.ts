import fetch from 'node-fetch';
import {getbaseURL, Done} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getIsUserVIP', () => {
    before((done: Done) => {
        db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES ('` + getHash("supertestman") + "')").then(done);
    });

    it('Should be able to get a 200', (done: Done) => {
        fetch(getbaseURL() + "/api/isUserVIP?userID=supertestman")
        .then(res => {
            if (res.status !== 200) done("non 200: " + res.status);
            else done(); // pass
        })
        .catch(err => done("couldn't call endpoint"));
    });


    it('Should get a 400 if no userID', (done: Done) => {
        fetch(getbaseURL() + "/api/isUserVIP")
        .then(res => {
            if (res.status !== 400) done("non 400: " + res.status);
            else done(); // pass
        })
        .catch(err => done("couldn't call endpoint"));
    });

    it('Should say a VIP is a VIP', (done: Done) => {
        fetch(getbaseURL() + "/api/isUserVIP?userID=supertestman")
        .then(async res => {
            if (res.status !== 200) done("non 200: " + res.status);
            else {
                const data = await res.json();
                if (data.vip === true) done(); // pass
                else done("Result was non-vip when should have been vip");
            }
        })
        .catch(err => done("couldn't call endpoint"));
    });

    it('Should say a normal user is not a VIP', (done: Done) => {
        fetch(getbaseURL() + "/api/isUserVIP?userID=regulartestman")
        .then(async res => {
            if (res.status !== 200) done("non 200: " + res.status);
            else {
                const data = await res.json();
                if (data.vip === false) done(); // pass
                else done("Result was vip when should have been non-vip");
            }
        })
        .catch(err => done("couldn't call endpoint"));
    });
});
