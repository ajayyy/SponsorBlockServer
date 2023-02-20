import { db, privateDB } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { Category } from "../../src/types/segments.model";
import { client } from "../utils/httpClient";

describe("shadowBanUser", () => {
    const getShadowBan = (userID: string) => db.prepare("get", `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);
    const getShadowBanSegments = (userID: string, status: number) => db.prepare("all", `SELECT "shadowHidden" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);
    const getShadowBanSegmentCategory = (userID: string, status: number): Promise<{shadowHidden: number, category: Category}[]> => db.prepare("all", `SELECT "shadowHidden", "category" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);

    const getIPShadowBan = (hashedIP: string) => db.prepare("get", `SELECT * FROM "shadowBannedIPs" WHERE "hashedIP" = ?`, [hashedIP]);

    const endpoint = "/api/shadowBanUser";
    const VIPuserID = "shadow-ban-vip";
    const video = "shadowBanVideo";
    const videohash = getHash(video, 1);

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

        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES(?)`, [getHash(VIPuserID)]);

        const privateInsertQuery = `INSERT INTO "sponsorTimes" ("videoID", "hashedIP", "timeSubmitted", "service") VALUES(?, ?, ?, ?)`;
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP7", 383848, "YouTube"]);
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP7", 2332, "YouTube"]);
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP7", 4923, "YouTube"]);

        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP8", 1674590916068933, "YouTube"]);
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP8", 1674590916062936, "YouTube"]);
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP8", 1674590916064324, "YouTube"]);
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP8", 1674590916062443, "YouTube"]);
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP8", 1674590916062342, "YouTube"]);
        await privateDB.prepare("run", privateInsertQuery, [video, "shadowBannedIP8", 1674590916069491, "YouTube"]);
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
                type: "3"
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

    it("Should be able to ban user by IP and hide submissions of a specific category", (done) => {
        const hashedIP = "shadowBannedIP7";
        const userID = "shadowBanned7";
        client({
            method: "POST",
            url: endpoint,
            params: {
                hashedIP,
                categories: `["sponsor", "intro"]`,
                adminUserID: VIPuserID,
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegments(userID, 1);
                const normalShadowRow = await getShadowBan(userID);
                const ipShadowRow = await getIPShadowBan(hashedIP);
                assert.ok(ipShadowRow);
                assert.ok(normalShadowRow);
                assert.strictEqual(videoRow.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to unban user by IP", (done) => {
        const hashedIP = "shadowBannedIP7";
        const userID = "shadowBanned7";
        client({
            method: "POST",
            url: endpoint,
            params: {
                hashedIP,
                enabled: false,
                unHideOldSubmissions: false,
                adminUserID: VIPuserID,
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegments(userID, 1);
                const normalShadowRow = await getShadowBan(userID);
                const ipShadowRow = await getIPShadowBan(hashedIP);
                assert.ok(!ipShadowRow);
                assert.ok(normalShadowRow);
                assert.strictEqual(videoRow.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to unban user by IP and unhide specific category", (done) => {
        const hashedIP = "shadowBannedIP7";
        const userID = "shadowBanned7";
        client({
            method: "POST",
            url: endpoint,
            params: {
                hashedIP,
                enabled: false,
                categories: `["sponsor"]`,
                unHideOldSubmissions: true,
                adminUserID: VIPuserID,
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegments(userID, 1);
                const normalShadowRow = await getShadowBan(userID);
                const ipShadowRow = await getIPShadowBan(hashedIP);
                assert.ok(!ipShadowRow);
                assert.ok(normalShadowRow);
                assert.strictEqual(videoRow.length, 1);
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

    it("Should be able to ban user by userID and other users who used that IP and hide specific category", (done) => {
        const hashedIP = "shadowBannedIP8";
        const userID = "shadowBanned8";
        const userID2 = "shadowBanned9";
        client({
            method: "POST",
            url: endpoint,
            params: {
                userID,
                enabled: true,
                categories: `["sponsor", "intro"]`,
                unHideOldSubmissions: true,
                adminUserID: VIPuserID,
                lookForIPs: true
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegments(userID, 1);
                const videoRow2 = await getShadowBanSegments(userID2, 1);
                const normalShadowRow = await getShadowBan(userID);
                const normalShadowRow2 = await getShadowBan(userID2);
                const ipShadowRow = await getIPShadowBan(hashedIP);
                assert.ok(ipShadowRow);
                assert.ok(normalShadowRow);
                assert.ok(normalShadowRow2);
                assert.strictEqual(videoRow.length, 2);
                assert.strictEqual(videoRow2.length, 2);
                done();
            })
            .catch(err => done(err));
    });
});
