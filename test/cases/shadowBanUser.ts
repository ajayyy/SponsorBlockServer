import { db, privateDB } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { Category, Service } from "../../src/types/segments.model";
import { client } from "../utils/httpClient";

describe("shadowBanUser", () => {
    const getShadowBan = (userID: string) => db.prepare("get", `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);
    const getShadowBanSegments = (userID: string, status: number) => db.prepare("all", `SELECT "shadowHidden" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);
    const getShadowBanSegmentCategory = (userID: string, status: number): Promise<{shadowHidden: number, category: Category}[]> => db.prepare("all", `SELECT "shadowHidden", "category" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);
    const getShadowBanTitles = (userID: string, status: number) => db.prepare("all", `SELECT tv."shadowHidden" FROM "titles" t JOIN "titleVotes" tv ON t."UUID" = tv."UUID" WHERE t."userID" = ? AND tv."shadowHidden" = ?`, [userID, status]);
    const getShadowBanThumbnails = (userID: string, status: number) => db.prepare("all", `SELECT tv."shadowHidden" FROM "thumbnails" t JOIN "thumbnailVotes" tv ON t."UUID" = tv."UUID" WHERE t."userID" = ? AND tv."shadowHidden" = ?`, [userID, status]);

    const endpoint = "/api/shadowBanUser";
    const VIPuserID = "shadow-ban-vip";
    const video = "shadowBanVideo";
    const videohash = getHash(video, 1);
    const isoDate = new Date().toISOString();

    before(async () => {
        const insertQuery = `INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "service", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.prepare("run", insertQuery, [video, 1, 11, 2, 0, "shadow-10", "shadowBanned", 0, 50, "sponsor", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 1, 11, 2, 0, "shadow-11", "shadowBanned", 0, 50, "sponsor", "PeerTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 33, 2, 0, "shadow-12", "shadowBanned", 0, 50, "intro", "YouTube", 0, videohash]);

        await db.prepare("run", insertQuery, [video, 1, 11, 2, 0, "shadow-20", "shadowBanned2", 0, 50, "sponsor", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 1, 11, 2, 0, "shadow-21", "shadowBanned2", 0, 50, "sponsor", "PeerTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 33, 2, 0, "shadow-22", "shadowBanned2", 0, 50, "intro", "YouTube", 0, videohash]);

        await db.prepare("run", insertQuery, [video, 1, 11, 2, 0, "shadow-30", "shadowBanned3", 0, 50, "sponsor", "YouTube", 1, videohash]);
        await db.prepare("run", insertQuery, [video, 1, 11, 2, 0, "shadow-31", "shadowBanned3", 0, 50, "sponsor", "PeerTube", 1, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 33, 2, 0, "shadow-32", "shadowBanned3", 0, 50, "intro", "YouTube", 1, videohash]);

        await db.prepare("run", insertQuery, [video, 21, 34, 2, 0, "shadow-40", "shadowBanned4", 0, 50, "sponsor", "YouTube", 0, videohash]);

        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-50", "shadowBanned5", 0, 50, "sponsor", "YouTube", 0, videohash]);

        await db.prepare("run", insertQuery, [video, 10, 10, 2, 1, "shadow-60", "shadowBanned6", 0, 50, "sponsor", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, ["lockedVideo", 10, 10, 2, 1, "shadow-61", "shadowBanned6", 0, 50, "sponsor", "YouTube", 0, getHash("lockedVideo", 1)]);

        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-70", "shadowBanned7", 383848, 50, "sponsor", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-71", "shadowBanned7", 2332, 50, "intro", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-72", "shadowBanned7", 4923, 50, "interaction", "YouTube", 0, videohash]);

        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-80", "shadowBanned8", 1674590916068933, 50, "sponsor", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-81", "shadowBanned8", 1674590916062936, 50, "intro", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-82", "shadowBanned8", 1674590916064324, 50, "interaction", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-90", "shadowBanned9", 1674590916062443, 50, "sponsor", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-91", "shadowBanned9", 1674590916062342, 50, "intro", "YouTube", 0, videohash]);
        await db.prepare("run", insertQuery, [video, 20, 10, 2, 0, "shadow-92", "shadowBanned9", 1674590916069491, 50, "interaction", "YouTube", 0, videohash]);

        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, ["shadowBanned3"]);
        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, ["shadowBanned4"]);

        await db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "actionType", "category", "service") VALUES (?, ?, ?, ?, ?)`,
            [getHash("shadow-ban-vip", 1), "lockedVideo", "skip", "sponsor", "YouTube"]);

        await db.prepare("run", `INSERT INTO "vipUsers" ("userID", "createdAt") VALUES(?, ?)`, [getHash(VIPuserID), isoDate]);

        const titleQuery = `INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const titleVotesQuery = `INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden", "verification") VALUES (?, ?, ?, ?, ?)`;
        const thumbnailQuery = `INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const thumbnailTimestampsQuery = `INSERT INTO "thumbnailTimestamps" ("UUID", "timestamp") VALUES (?, ?)`;
        const thumbnailVotesQuery = `INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, ?, ?, ?)`;

        await Promise.all([
            db.prepare("run", titleQuery, [video, "title1", 0, "userID1-ban", Service.YouTube, videohash, 1, "UUID1-ban"]),
            db.prepare("run", titleQuery, [video, "title2", 0, "userID1-ban", Service.YouTube, videohash, 1, "UUID2-ban"]),
            db.prepare("run", titleQuery, [video, "title3", 1, "userID1-ban", Service.YouTube, videohash, 1, "UUID3-ban"]),
            db.prepare("run", thumbnailQuery, [video, 0, "userID1-ban", Service.YouTube, videohash, 1, "UUID1T-ban"]),
            db.prepare("run", thumbnailQuery, [video, 1, "userID1-ban", Service.YouTube, videohash, 1, "UUID2T-ban"]),
            db.prepare("run", thumbnailQuery, [video, 0, "userID1-ban", Service.YouTube, videohash, 1, "UUID3T-ban"]),
        ]);

        await Promise.all([
            db.prepare("run", titleVotesQuery, ["UUID1-ban", 3, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID2-ban", 2, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID3-ban", 1, 0, 0, 0]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID1T-ban", 1]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID3T-ban", 3]),
            db.prepare("run", thumbnailVotesQuery, ["UUID1T-ban", 3, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID2T-ban", 2, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID3T-ban", 1, 0, 0]),
        ]);

        await Promise.all([
            db.prepare("run", titleQuery, [video, "title11", 0, "userID2-ban", Service.YouTube, videohash, 1, "UUID1-ban2"]),
            db.prepare("run", titleQuery, [video, "title12", 0, "userID2-ban", Service.YouTube, videohash, 1, "UUID2-ban2"]),
            db.prepare("run", titleQuery, [video, "title13", 1, "userID2-ban", Service.YouTube, videohash, 1, "UUID3-ban2"]),
            db.prepare("run", thumbnailQuery, [video, 0, "userID2-ban", Service.YouTube, videohash, 1, "UUID1T-ban2"]),
            db.prepare("run", thumbnailQuery, [video, 1, "userID2-ban", Service.YouTube, videohash, 1, "UUID2T-ban2"]),
            db.prepare("run", thumbnailQuery, [video, 0, "userID2-ban", Service.YouTube, videohash, 1, "UUID3T-ban2"]),
        ]);

        await Promise.all([
            db.prepare("run", titleVotesQuery, ["UUID1-ban2", 3, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID2-ban2", 2, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID3-ban2", 1, 0, 0, 0]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID1T-ban2", 1]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID3T-ban2", 3]),
            db.prepare("run", thumbnailVotesQuery, ["UUID1T-ban2", 3, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID2T-ban2", 2, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID3T-ban2", 1, 0, 0])
        ]);

        await Promise.all([
            db.prepare("run", titleQuery, [video, "title31", 0, "userID3-ban", Service.YouTube, videohash, 1, "UUID1-ban3"]),
            db.prepare("run", thumbnailQuery, [video, 0, "userID3-ban", Service.YouTube, videohash, 1, "UUID1T-ban3"]),
        ]);
    });

    it("Should be able to ban user and hide submissions", (done) => {
        const userID = "shadowBanned";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegments(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow);
                assert.strictEqual(videoRow.length, 3);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to unban user without unhiding submissions", (done) => {
        const userID = "shadowBanned";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: false,
                unHideOldSubmissions: false,
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegments(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(!shadowRow);
                assert.strictEqual(videoRow.length, 3);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to ban user and hide submissions from only some categories", (done) => {
        const userID = "shadowBanned2";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                categories: `["sponsor"]`
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegmentCategory(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow);
                assert.strictEqual(videoRow.length, 2);
                assert.strictEqual(videoRow.filter((elem) => elem.category === "sponsor").length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to unban user and unhide submissions", (done) => {
        const userID = "shadowBanned2";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: false,
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegments(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(!shadowRow);
                assert.strictEqual(videoRow?.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to unban user and unhide some submissions", (done) => {
        const userID = "shadowBanned3";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: false,
                categories: `["sponsor"]`
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegmentCategory(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(!shadowRow);
                assert.strictEqual(videoRow.length, 1);
                assert.strictEqual(videoRow[0].category, "intro");
                done();
            })
            .catch(err => done(err));
    });

    it("Should get 409 when re-shadowbanning user", (done) => {
        const userID = "shadowBanned4";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: true,
                categories: `["sponsor"]`,
                unHideOldSubmissions: false
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const videoRow = await getShadowBanSegmentCategory(userID, 0);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow); // ban still exists
                assert.strictEqual(videoRow.length, 1); // videos should not be hidden
                assert.strictEqual(videoRow[0].category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to re-shadowban user to hide old submissions", (done) => {
        const userID = "shadowBanned4";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: true,
                categories: `["sponsor"]`,
                unHideOldSubmissions: true
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegmentCategory(userID, 0);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow); // ban still exists
                assert.strictEqual(videoRow.length, 0); // videos should be hidden
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to un-shadowban user to restore old submissions", (done) => {
        const userID = "shadowBanned4";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: false,
                categories: `["sponsor"]`,
                unHideOldSubmissions: true
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegmentCategory(userID, 0);
                const shadowRow = await getShadowBan(userID);
                assert.ok(!shadowRow); // ban still exists
                assert.strictEqual(videoRow.length, 1); // videos should be visible
                assert.strictEqual(videoRow[0].category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to shadowban user with different type", (done) => {
        const userID = "shadowBanned5";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: true,
                categories: `["sponsor"]`,
                unHideOldSubmissions: true,
                type: "2"
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const type2Videos = await getShadowBanSegmentCategory(userID, 2);
                const type1Videos = await getShadowBanSegmentCategory(userID, 1);
                const type0Videos = await getShadowBanSegmentCategory(userID, 0);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow); // ban still exists
                assert.ok(type2Videos.length > 0); // videos at type 2
                assert.strictEqual(type1Videos.length, 0); // no videos at type 1
                assert.strictEqual(type0Videos.length, 0); // no videos at type 0
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to shadowban user with invalid type", (done) => {
        const userID = "shadowBanned5";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: true,
                categories: `["sponsor"]`,
                unHideOldSubmissions: true,
                type: "bad"
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should exclude locked segments when shadowbanning and removing segments", (done) => {
        const userID = "shadowBanned6";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: true,
                categories: `["sponsor"]`,
                unHideOldSubmissions: true
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const type1Videos = await getShadowBanSegmentCategory(userID, 2);
                const type0Videos = await getShadowBanSegmentCategory(userID, 0);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow); // ban exists
                assert.strictEqual(type1Videos.length, 0); // no banned videos
                assert.strictEqual(type0Videos.length, 1); // video still visible
                done();
            })
            .catch(err => done(err));
    });

    it("Should be possible to ban self", (done) => {
        const userID = VIPuserID;
        const hashUserID = getHash(userID);
        client({
            method: "POST",
            url: endpoint,
            params: {
                enabled: true,
                userID: hashUserID,
                categories: `["sponsor"]`,
                unHideOldSubmissions: true,
                adminUserID: userID,
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to ban user and hide dearrow submissions", (done) => {
        const userID = "userID1-ban";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const titles = await getShadowBanTitles(userID, 1);
                const thumbnails = await getShadowBanThumbnails(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow);
                assert.strictEqual(titles.length, 3);
                assert.strictEqual(thumbnails.length, 3);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to ban user and hide just dearrow titles", (done) => {
        const userID = "userID2-ban";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                deArrowTypes: `["title"]`
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const titles = await getShadowBanTitles(userID, 1);
                const thumbnails = await getShadowBanThumbnails(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow);
                assert.strictEqual(titles.length, 3);
                assert.strictEqual(thumbnails.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to ban user with bad/ empty categories", (done) => {
        const userID = "userID4-ban";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                adminUserID: VIPuserID,
                enabled: true,
                unHideOldSubmissions: true,
                categories: `[]`,
                deArrowTypes: `["title","thumbnail"]`
            }
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });
});
