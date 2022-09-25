import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

const generateSegment = (userid: string, category: string) => ["getTopUsers", 0, 60, 50, `getTopUserUUID_${category}`, getHash(userid), 1, 1, category, 0];

describe("getTopUsers", () => {
    const endpoint = "/api/getTopUsers";
    const user1 = "gettop_1";
    const user2 = "gettop_2";
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash(user1), user1]);
        await db.prepare("run", insertUserNameQuery, [getHash(user2), user2]);

        const sponsorTimesQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", sponsorTimesQuery, generateSegment(user1, "sponsor"));
        await db.prepare("run", sponsorTimesQuery, generateSegment(user1, "selfpromo"));
        await db.prepare("run", sponsorTimesQuery, generateSegment(user2, "interaction"));
    });

    it("Should return 400 if no sortType", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if invalid sortType provided", (done) => {
        client.get(endpoint, { params: { sortType: "a" } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if undefined sortType provided", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get by all sortTypes", (done) => {
        client.get(endpoint, { params: { sortType: 0 } })// minutesSaved
            .then(res => {
                // make sure that user1 is before user2
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.userNames.indexOf(user1) < res.data.userNames.indexOf(user2), `Actual Order: ${res.data.userNames}`);
            })
            .catch(err => done(err));
        client.get(endpoint, { params: { sortType: 1 } }) // viewCount
            .then(res => {
                // make sure that user1 is before user2
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.userNames.indexOf(user1) < res.data.userNames.indexOf(user2), `Actual Order: ${res.data.userNames}`);
            })
            .catch(err => done(err));
        client.get(endpoint, { params: { sortType: 2 } }) // totalSubmissions
            .then(res => {
                // make sure that user1 is before user2
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.userNames.indexOf(user1) < res.data.userNames.indexOf(user2), `Actual Order: ${res.data.userNames}`);
            })
            .catch(err => done(err));
        done();
    });

    it("Should be able to get - with categoryStats", (done) => {
        client.get(endpoint, { params: { sortType: 0, categoryStats: true } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(res.data.categoryStats[0].length > 1);
                done();
            })
            .catch(err => done(err));
    });
});
