import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

const userOnePrivateID = "getuserstats_user_01";
const userOnePublicID = getHash(userOnePrivateID);
const userTwoPrivateID = "getuserstats_user_02";
const userTwoPublicID = getHash(userTwoPrivateID);
const userThreePrivateID = "getuserstats_user_03";
const userThreePublicID = getHash(userThreePrivateID);
const userFourPrivateID = "getuserstats_user_04";
const userFourPublicID = getHash(userFourPrivateID);
const isoDate = new Date().toISOString();

describe("getUserStats", () => {
    const endpoint = "/api/userStats";
    before(async () => {
        const insertBanQuery = 'INSERT INTO "shadowBannedUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertBanQuery, [userThreePublicID]);

        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName", "createdAt", "updatedAt") VALUES(?, ?, ?, ?)';
        await db.prepare("run", insertUserNameQuery, [userOnePublicID, "Username user 01", isoDate, isoDate]);

        const sponsorTimesQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "actionType", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "updatedAt") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid1", userOnePublicID, 1, 1, "sponsor", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid2", userOnePublicID, 2, 2, "selfpromo", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid3", userOnePublicID, 3, 3, "interaction", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid4", userOnePublicID, 4, 4, "intro", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid5", userOnePublicID, 5, 5, "outro", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid6", userOnePublicID, 6, 6, "preview", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid7", userOnePublicID, 7, 7, "music_offtopic", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 11, 11, 0, "poi", "getuserstatsuuid8", userOnePublicID, 8, 8, "poi_highlight", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userTwoPrivateID, 0, 60, -2, "skip", "getuserstatsuuid9", userTwoPublicID, 8, 2, "sponsor", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "skip", "getuserstatsuuid10", userOnePublicID, 8, 2, "filler", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 0, 0, "full", "getuserstatsuuid11", userOnePublicID, 8, 2, "exclusive_access", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userOnePrivateID, 0, 60, 0, "chapter", "getuserstatsuuid12", userOnePublicID, 9, 2, "chapter", 0, isoDate]);

        // fully banned user
        await db.prepare("run", sponsorTimesQuery, [userThreePrivateID, 0, 60, 0, "skip", "getuserstatsuuid13", userThreePublicID, 1, 1, "sponsor", 1, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userThreePrivateID, 0, 60, 0, "skip", "getuserstatsuuid14", userThreePublicID, 1, 1, "sponsor", 1, isoDate]);
        // user with banned segments
        await db.prepare("run", sponsorTimesQuery, [userFourPrivateID, 0, 60, 0, "skip", "getuserstatsuuid15", userFourPublicID, 1, 1, "sponsor", 0, isoDate]);
        await db.prepare("run", sponsorTimesQuery, [userFourPrivateID, 0, 60, 0, "skip", "getuserstatsuuid16", userFourPublicID, 1, 1, "sponsor", 1, isoDate]);
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
        client.get(endpoint, { params: { userID: userOnePrivateID, fetchCategoryStats: true, fetchActionTypeStats: true } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    userName: "Username user 01",
                    userID: userOnePublicID,
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
                        exclusive_access: 1,
                        chapter: 1,
                    },
                    actionTypeCount: {
                        mute: 0,
                        skip: 8,
                        full: 1,
                        poi: 1,
                        chapter: 1,
                    },
                    overallStats: {
                        minutesSaved: 30,
                        segmentCount: 11
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
        client.get(endpoint, { params: { userID: userTwoPrivateID } })
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
        client.get(endpoint, { params: { userID: userOnePrivateID } })
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
        client.get(endpoint, { params: { userID: userOnePrivateID, fetchActionTypeStats: true } })
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

    it("Should return stats for banned segments if user is banned", (done) => {
        client.get(endpoint, { params: { userID: userThreePrivateID } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    userID: userThreePublicID,
                    overallStats: {
                        minutesSaved: 2,
                        segmentCount: 2
                    }
                };
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not return stats for banned segments", (done) => {
        client.get(endpoint, { params: { userID: userFourPrivateID } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    userID: userFourPublicID,
                    overallStats: {
                        minutesSaved: 1,
                        segmentCount: 1
                    }
                };
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });
});
