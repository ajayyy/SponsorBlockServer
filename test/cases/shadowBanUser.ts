import fetch from "node-fetch";
import {db} from "../../src/databases/databases";
import { Done } from "../utils/utils";
import { getbaseURL } from "../utils/getBaseURL";
import {getHash} from "../../src/utils/getHash";
import assert from "assert";
import { Category } from "../../src/types/segments.model";

describe("shadowBanUser", () => {
    const endpoint = `${getbaseURL()}/api/shadowBanUser`;
    const getShadowBan = (userID: string) => db.prepare("get", `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);
    const getShadowBanSegments = (userID: string, status: number) => db.prepare("all", `SELECT "shadowHidden" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);
    const getShadowBanSegmentCategory = (userID: string, status: number): Promise<{shadowHidden: number, category: Category}[]> => db.prepare("all", `SELECT "shadowHidden", "category" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, [userID, status]);

    const VIPuserID = "shadow-ban-vip";

    before(async () => {
        const insertQuery = `INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.prepare("run", insertQuery, ["testtesttest", 1, 11, 2, 0, "shadow-1-uuid-0", "shadowBanned", 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash("testtesttest", 1)]);
        await db.prepare("run", insertQuery, ["testtesttest2", 1, 11, 2, 0, "shadow-1-uuid-0-1", "shadowBanned", 0, 50, "sponsor", "PeerTube", 120, 0, 0, getHash("testtesttest2", 1)]);
        await db.prepare("run", insertQuery, ["testtesttest", 20, 33, 2, 0, "shadow-1-uuid-2", "shadowBanned", 0, 50, "intro", "YouTube", 101, 0, 0, getHash("testtesttest", 1)]);

        await db.prepare("run", insertQuery, ["testtesttest", 1, 11, 2, 0, "shadow-2-uuid-0", "shadowBanned2", 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash("testtesttest", 1)]);
        await db.prepare("run", insertQuery, ["testtesttest2", 1, 11, 2, 0, "shadow-2-uuid-0-1", "shadowBanned2", 0, 50, "sponsor", "PeerTube", 120, 0, 0, getHash("testtesttest2", 1)]);
        await db.prepare("run", insertQuery, ["testtesttest", 20, 33, 2, 0, "shadow-2-uuid-2", "shadowBanned2", 0, 50, "intro", "YouTube", 101, 0, 0, getHash("testtesttest", 1)]);

        await db.prepare("run", insertQuery, ["testtesttest", 1, 11, 2, 0, "shadow-3-uuid-0", "shadowBanned3", 0, 50, "sponsor", "YouTube", 100, 0, 1, getHash("testtesttest", 1)]);
        await db.prepare("run", insertQuery, ["testtesttest2", 1, 11, 2, 0, "shadow-3-uuid-0-1", "shadowBanned3", 0, 50, "sponsor", "PeerTube", 120, 0, 1, getHash("testtesttest2", 1)]);
        await db.prepare("run", insertQuery, ["testtesttest", 20, 33, 2, 0, "shadow-3-uuid-2", "shadowBanned3", 0, 50, "intro", "YouTube", 101, 0, 1, getHash("testtesttest", 1)]);

        await db.prepare("run", insertQuery, ["testtesttest", 21, 34, 2, 0, "shadow-4-uuid-1", "shadowBanned4", 0, 50, "sponsor", "YouTube", 101, 0, 0, getHash("testtesttest", 1)]);

        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, ["shadowBanned3"]);
        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, ["shadowBanned4"]);

        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES(?)`, [getHash(VIPuserID)]);
    });

    it("Should be able to ban user and hide submissions", (done: Done) => {
        const userID = "shadowBanned";
        fetch(`${endpoint}?userID=${userID}&adminUserID=${VIPuserID}`, {
            method: "POST"
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

    it("Should be able to unban user without unhiding submissions", (done: Done) => {
        const userID = "shadowBanned";
        fetch(`${endpoint}?userID=${userID}&adminUserID=${VIPuserID}&enabled=false&unHideOldSubmissions=false`, {
            method: "POST"
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

    it("Should be able to ban user and hide submissions from only some categories", (done: Done) => {
        const userID = "shadowBanned2";
        fetch(`${endpoint}?userID=${userID}&adminUserID=${VIPuserID}&categories=["sponsor"]`, {
            method: "POST"
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

    it("Should be able to unban user and unhide submissions", (done: Done) => {
        const userID = "shadowBanned2";
        fetch(`${endpoint}?userID=${userID}&adminUserID=${VIPuserID}&enabled=false`, {
            method: "POST"
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

    it("Should be able to unban user and unhide some submissions", (done: Done) => {
        const userID = "shadowBanned3";
        fetch(`${endpoint}?userID=${userID}&adminUserID=${VIPuserID}&enabled=false&categories=["sponsor"]`, {
            method: "POST"
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

    it("Should get 409 when re-shadowbanning user", (done: Done) => {
        const userID = "shadowBanned4";
        fetch(`${endpoint}?userID=${userID}&adminUserID=${VIPuserID}&enabled=true&categories=["sponsor"]&unHideOldSubmissions=false`, {
            method: "POST"
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

    it("Should be able to re-shadowban user to hide old submissions", (done: Done) => {
        const userID = "shadowBanned4";
        fetch(`${endpoint}?userID=${userID}&adminUserID=${VIPuserID}&enabled=true&categories=["sponsor"]&unHideOldSubmissions=true`, {
            method: "POST"
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const videoRow = await getShadowBanSegmentCategory(userID, 1);
                const shadowRow = await getShadowBan(userID);
                assert.ok(shadowRow); // ban still exists
                assert.strictEqual(videoRow.length, 1); // videos should be hidden
                assert.strictEqual(videoRow[0].category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });
});
