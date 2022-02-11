import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

describe("getUserStats", () => {
    const endpoint = "/api/userStats";
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash("getuserstats_user_01"), "Username user 01"]);

        const sponsorTimesQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "actionType", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid1", getHash("getuserstats_user_01"), 1, 1, "sponsor", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid2", getHash("getuserstats_user_01"), 2, 2, "selfpromo", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid3", getHash("getuserstats_user_01"), 3, 3, "interaction", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid4", getHash("getuserstats_user_01"), 4, 4, "intro", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid5", getHash("getuserstats_user_01"), 5, 5, "outro", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid6", getHash("getuserstats_user_01"), 6, 6, "preview", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid7", getHash("getuserstats_user_01"), 7, 7, "music_offtopic", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 11, 11, 0, "poi", "getuserstatsuuid8", getHash("getuserstats_user_01"), 8, 8, "poi_highlight", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, -2, "skip", "getuserstatsuuid9", getHash("getuserstats_user_02"), 8, 2, "sponsor", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 60, 0, "skip", "getuserstatsuuid10", getHash("getuserstats_user_01"), 8, 2, "filler", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getuserstats1", 0, 0, 0, "full", "getuserstatsuuid11", getHash("getuserstats_user_01"), 8, 2, "exclusive_access", 0]);


    });

    it("Should be able to get a 400 (No userID parameter)", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get all user info", (done) => {
        client.get(endpoint, { params: { userID: "getuserstats_user_01", fetchCategoryStats: true, fetchActionTypeStats: true } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    userName: "Username user 01",
                    userID: getHash("getuserstats_user_01"),
                    categoryCount: {
                        sponsor: 1,
                        selfpromo: 1,
                        interaction: 1,
                        intro: 1,
                        outro: 1,
                        preview: 1,
                        music_offtopic: 1,
                        poi_highlight: 1,
                        filler: 1,
                        exclusive_access: 1
                    },
                    actionTypeCount: {
                        mute: 0,
                        skip: 8,
                        full: 1,
                        poi: 1
                    },
                    overallStats: {
                        minutesSaved: 30,
                        segmentCount: 10
                    }
                };
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get all zeroes for invalid userid", (done) => {
        client.get(endpoint, { params: { userID: "getuserstats_user_invalid" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                for (const value in data.overallStats) {
                    if (data[value]) {
                        done(`returned non-zero for ${value}`);
                    }
                }
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get all zeroes for only ignored segments", (done) => {
        client.get(endpoint, { params: { userID: "getuserstats_user_02" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                for (const value in data.overallStats) {
                    if (data[value]) {
                        done(`returned non-zero for ${value}`);
                    }
                }
                done();
            })
            .catch(err => done(err));
    });

    it("Should not get extra stats if not requested", (done) => {
        client.get(endpoint, { params: { userID: "getuserstats_user_01" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                // check for categoryCount
                if (data.categoryCount || data.actionTypeCount) {
                    done("returned extra stats");
                }
                done();
            })
            .catch(err => done(err));
    });

    it("Should get parts of extra stats if not requested", (done) => {
        client.get(endpoint, { params: { userID: "getuserstats_user_01", fetchActionTypeStats: true } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                // check for categoryCount
                if (data.categoryCount && !data.actionTypeCount) {
                    done("returned extra stats");
                }
                done();
            })
            .catch(err => done(err));
    });
});
