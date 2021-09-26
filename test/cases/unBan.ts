import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
import assert from "assert";

describe("unBan", () => {
    const endpoint = "/api/shadowBanUser";
    const VIPuser = "VIPUser-unBan";
    const postUnBan = (userID: string, adminUserID: string, enabled: boolean) => client({
        url: endpoint,
        method: "POST",
        params: {
            userID,
            adminUserID,
            enabled
        }
    });
    const videoIDUnBanCheck = (videoID: string, userID: string, status: number) => db.prepare("all", 'SELECT * FROM "sponsorTimes" WHERE "videoID" = ? AND "userID" = ? AND "shadowHidden" = ?', [videoID, userID, status]);
    before(async () => {
        const insertShadowBannedUserQuery = 'INSERT INTO "shadowBannedUsers" VALUES(?)';
        await db.prepare("run", insertShadowBannedUserQuery, ["testMan-unBan"]);
        await db.prepare("run", insertShadowBannedUserQuery, ["testWoman-unBan"]);
        await db.prepare("run", insertShadowBannedUserQuery, ["testEntity-unBan"]);

        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash(VIPuser)]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category") VALUES(?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash(VIPuser), "unBan-videoID-1", "sponsor"]);

        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimeQuery, ["unBan-videoID-0", 1, 11, 2, "unBan-uuid-0", "testMan-unBan", 0, 50, "sponsor", 1, getHash("unBan-videoID-0", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["unBan-videoID-1", 1, 11, 2, "unBan-uuid-1", "testWoman-unBan", 0, 50, "sponsor", 1, getHash("unBan-videoID-1", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["unBan-videoID-1", 1, 11, 2, "unBan-uuid-2", "testEntity-unBan", 0, 60, "sponsor", 1, getHash("unBan-videoID-1", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["unBan-videoID-2", 1, 11, 2, "unBan-uuid-3", "testEntity-unBan", 0, 60, "sponsor", 1, getHash("unBan-videoID-2", 1)]);
    });

    it("Should be able to unban a user and re-enable shadow banned segments", (done) => {
        const userID = "testMan-unBan";
        postUnBan(userID, VIPuser, false)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await videoIDUnBanCheck("unBan-videoID-0", userID, 1);
                assert.strictEqual(result.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to unban a user and re-enable shadow banned segments without lockCategories entrys", (done) => {
        const userID = "testWoman-unBan";
        postUnBan(userID, VIPuser, false)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await videoIDUnBanCheck("unBan-videoID-1", userID, 1);
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to unban a user and re-enable shadow banned segments with a mix of lockCategories entrys", (done) => {
        const userID = "testEntity-unBan";
        postUnBan(userID, VIPuser, false)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?', [userID, 1]);
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });
});
