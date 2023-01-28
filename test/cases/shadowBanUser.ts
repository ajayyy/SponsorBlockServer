import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { Category } from "../../src/types/segments.model";
import { client } from "../utils/httpClient";

describe("shadowBanUser", () => {
    const getShadowBan = (userID: string) => db.prepare("get", `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);
    const getShadowBanSegments = (userID: string, status: number) => db.prepare("all", `SELECT "shadowHidden" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);
    const getShadowBanSegmentCategory = (userID: string, status: number): Promise<{shadowHidden: number, category: Category}[]> => db.prepare("all", `SELECT "shadowHidden", "category" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);

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

        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, ["shadowBanned3"]);
        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, ["shadowBanned4"]);

        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES(?)`, [getHash(VIPuserID)]);
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
});
