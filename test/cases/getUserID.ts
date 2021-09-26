import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";
import { AxiosResponse } from "axios";

const endpoint = "/api/userID";
const getUserName = (username: string): Promise<AxiosResponse> => client.get(endpoint, { params: { username } });

describe("getUserID", () => {
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_01"), "fuzzy user 01"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_02"), "fuzzy user 02"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_03"), "specific user 03"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_04"), "repeating"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_05"), "repeating"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_06"), getHash("getuserid_user_06")]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_07"), "0redos0"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_08"), "%redos%"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_09"), "_redos_"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_10"), "redos\\%"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_11"), "\\\\\\"]);
        await db.prepare("run", insertUserNameQuery, [getHash("getuserid_user_12"), "a"]);
    });

    it("Should be able to get a 200", (done) => {
        getUserName("fuzzy user 01")
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get a 400 (No username parameter)", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get a 200 (username is public id)", (done) => {
        client.get(endpoint, { params: { username: getHash("getuserid_user_06") } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get a 400 (username longer than 64 chars)", (done) => {
        client.get(endpoint, { params: { username: `${getHash("getuserid_user_06")}0` } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get single username", (done) => {
        client.get(endpoint, { params: { username: "fuzzy user 01" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "fuzzy user 01",
                    userID: getHash("getuserid_user_01")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get multiple fuzzy user info from start", (done) => {
        getUserName("fuzzy user")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "fuzzy user 01",
                    userID: getHash("getuserid_user_01")
                }, {
                    userName: "fuzzy user 02",
                    userID: getHash("getuserid_user_02")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get multiple fuzzy user info from middle", (done) => {
        getUserName("user")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "fuzzy user 01",
                    userID: getHash("getuserid_user_01")
                }, {
                    userName: "fuzzy user 02",
                    userID: getHash("getuserid_user_02")
                }, {
                    userName: "specific user 03",
                    userID: getHash("getuserid_user_03")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get with public ID", (done) => {
        const userID = getHash("getuserid_user_06");
        getUserName(userID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: userID,
                    userID
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get with fuzzy public ID", (done) => {
        const userID = getHash("getuserid_user_06");
        getUserName(userID.substr(10,60))
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: userID,
                    userID
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get repeating username", (done) => {
        getUserName("repeating")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "repeating",
                    userID: getHash("getuserid_user_04")
                }, {
                    userName: "repeating",
                    userID: getHash("getuserid_user_05")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get repeating fuzzy username", (done) => {
        getUserName("peat")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "repeating",
                    userID: getHash("getuserid_user_04")
                }, {
                    userName: "repeating",
                    userID: getHash("getuserid_user_05")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should avoid ReDOS with _", (done) => {
        getUserName("_redos_")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "_redos_",
                    userID: getHash("getuserid_user_09")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should avoid ReDOS with %", (done) => {
        getUserName("%redos%")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "%redos%",
                    userID: getHash("getuserid_user_08")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 if escaped backslashes present", (done) => {
        getUserName("%redos\\\\_")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 if backslashes present", (done) => {
        getUserName(`\\%redos\\_`)
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("should return user if just backslashes", (done) => {
        getUserName(`\\\\\\`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "\\\\\\",
                    userID: getHash("getuserid_user_11")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should not allow usernames more than 64 characters", (done) => {
        getUserName("0".repeat(65))
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("should not allow usernames less than 3 characters", (done) => {
        getUserName("aa")
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("should allow exact match", (done) => {
        client.get(endpoint, { params: { username: "a", exact: true } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "a",
                    userID: getHash("getuserid_user_12")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get repeating username with exact username", (done) => {
        client.get(endpoint, { params: { username: "repeating", exact: true } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "repeating",
                    userID: getHash("getuserid_user_04")
                }, {
                    userName: "repeating",
                    userID: getHash("getuserid_user_05")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not get exact unless explicitly set to true", (done) => {
        client.get(endpoint, { params: { username: "user", exact: 1 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    userName: "fuzzy user 01",
                    userID: getHash("getuserid_user_01")
                }, {
                    userName: "fuzzy user 02",
                    userID: getHash("getuserid_user_02")
                }, {
                    userName: "specific user 03",
                    userID: getHash("getuserid_user_03")
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if no username parameter specified", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(() => ("couldn't call endpoint"));
    });
});
