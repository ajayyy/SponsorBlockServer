import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {IDatabase} from "../../src/databases/IDatabase";

declare const db: IDatabase

describe('getIsUserVIP', () => {
    beforeAll(() =>
        db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [getHash("supertestman")])
    );

    it('Should be able to get a 200', () =>
        fetch(getbaseURL() + "/api/isUserVIP?userID=supertestman")
        .then(res => {
            if (res.status !== 200) throw new Error("non 200: " + res.status);
        })
    );


    it('Should get a 400 if no userID', () =>
        fetch(getbaseURL() + "/api/isUserVIP")
        .then(res => {
            if (res.status !== 400) throw new Error("non 400: " + res.status);
        })
    );

    it('Should say a VIP is a VIP', () =>
        fetch(getbaseURL() + "/api/isUserVIP?userID=supertestman")
        .then(async res => {
            if (res.status !== 200) throw new Error("non 200: " + res.status);
            else {
                const data = await res.json();
                if (!data.vip) throw new Error("Result was non-vip when should have been vip");
            }
        })
    );

    it('Should say a normal user is not a VIP', () =>
        fetch(getbaseURL() + "/api/isUserVIP?userID=regulartestman")
        .then(async res => {
            if (res.status !== 200) throw new Error("non 200: " + res.status);
            else {
                const data = await res.json();
                if (data.vip) throw new Error("Result was vip when should have been non-vip");
            }
        })
    );
});
