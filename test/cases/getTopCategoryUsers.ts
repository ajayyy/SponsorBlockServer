import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

const generateSegment = (userid: string, category: string) => ["getTopCategory", 0, 60, 50, `getTopCategoryUUID_${category}`, getHash(userid), 1, 1, category, 0];

describe("getTopCategoryUsers", () => {
    const endpoint = "/api/getTopCategoryUsers";
    const user1 = "gettopcategory_1";
    const user2 = "gettopcategory_2";
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

    it("Should return 400 if invalid category provided", (done) => {
        client.get(endpoint, { params: { sortType: 1, category: "never_valid_category" } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get by all sortTypes", (done) => {
        client.get(endpoint, { params: {  category: "sponsor", sortType: 0 } })// minutesSaved
            .then(res => {
                assert.strictEqual(res.status, 200);
            })
            .catch(err => done(err));
        client.get(endpoint, { params: { category: "sponsor", sortType: 1 } }) // viewCount
            .then(res => {
                assert.strictEqual(res.status, 200);
            })
            .catch(err => done(err));
        client.get(endpoint, { params: { category: "sponsor", sortType: 2 } }) // totalSubmissions
            .then(res => {
                assert.strictEqual(res.status, 200);
            })
            .catch(err => done(err));
        done();
    });

    it("Should return accurate sponsor data", (done) => {
        client.get(endpoint, { params: { sortType: 1, category: "sponsor" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(!res.data.userNames.includes(user2), "User 2 should not be present");
                const user1idx = res.data.userNames.indexOf(user1);
                assert.ok(user1idx > -1, "User 1 should be present");
                assert.strictEqual(res.data.viewCounts[user1idx], 1, "User should have 1 view");
                assert.strictEqual(res.data.totalSubmissions[user1idx], 1, "User should have 1 submission");
                assert.strictEqual(res.data.minutesSaved[user1idx], 1, "User should have 1 minutes saved");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return accurate selfpromo data", (done) => {
        client.get(endpoint, { params: { sortType: 1, category: "selfpromo" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(!res.data.userNames.includes(user2), "User 2 should not be present");
                const user1idx = res.data.userNames.indexOf(user1);
                assert.ok(user1idx > -1, "User 1 should be present");
                assert.strictEqual(res.data.viewCounts[user1idx], 1, "User should have 1 view");
                assert.strictEqual(res.data.totalSubmissions[user1idx], 1, "User should have 1 submission");
                assert.strictEqual(res.data.minutesSaved[user1idx], 1, "User should have 1 minutes saved");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return accurate interaction data", (done) => {
        client.get(endpoint, { params: { sortType: 1, category: "interaction" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(!res.data.userNames.includes(user1), "User 1 should not be present");
                const user1idx = res.data.userNames.indexOf(user2);
                assert.ok(user1idx > -1, "User 2 should be present");
                assert.strictEqual(res.data.viewCounts[user1idx], 1, "User should have 1 view");
                assert.strictEqual(res.data.totalSubmissions[user1idx], 1, "User should have 1 submission");
                assert.strictEqual(res.data.minutesSaved[user1idx], 1, "User should have 1 minutes saved");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return accurate outro data", (done) => {
        client.get(endpoint, { params: { sortType: 1, category: "outro" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(!res.data.userNames.includes(user1), "User 1 should not be present");
                assert.ok(!res.data.userNames.includes(user2), "User 2 should not be present");
                done();
            })
            .catch(err => done(err));
    });
});
