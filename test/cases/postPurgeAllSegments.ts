import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import { IDatabase } from "../../src/databases/IDatabase";
import assert from "assert";
import { client } from "../utils/httpClient";

async function dbSponsorTimesAdd(db: IDatabase, videoID: string, startTime: number, endTime: number, UUID: string, category: string) {
    const votes = 0,
        userID = 0,
        timeSubmitted = 0,
        views = 0,
        shadowHidden = 0,
        hidden = 0,
        hashedVideoID = `hash_${UUID}`;
    await db.prepare("run", `INSERT INTO
        "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID",
        "userID", "timeSubmitted", "views", "category", "shadowHidden", "hashedVideoID", "hidden")
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID, hidden]);
}

async function dbSponsorTimesCompareExpect(db: IDatabase, videoId: string, expectdHidden: number) {
    const seg = await db.prepare("get", `SELECT "hidden", "UUID" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoId]);
    for (let i = 0, len = seg.length; i < len; i++) {
        if (seg.hidden !== expectdHidden) {
            return `${seg.UUID} hidden expected to be ${expectdHidden} but found ${seg.hidden}`;
        }
    }
    return;
}

describe("postPurgeAllSegments", function () {
    const privateVipUserID = "VIPUser-purgeAll";
    const vipUserID = getHash(privateVipUserID);
    const endpoint = "/api/purgeAllSegments";
    const postSegmentShift = (videoID: string, userID: string) => client.post(endpoint, { videoID, userID });

    before(async function () {
        // startTime and endTime get set in beforeEach for consistency
        await dbSponsorTimesAdd(db, "vsegpurge01", 0, 1, "vsegpurgetest01uuid01", "intro");
        await dbSponsorTimesAdd(db, "vsegpurge01", 0, 2, "vsegpurgetest01uuid02", "sponsor");
        await dbSponsorTimesAdd(db, "vsegpurge01", 0, 3, "vsegpurgetest01uuid03", "interaction");
        await dbSponsorTimesAdd(db, "vsegpurge01", 0, 4, "vsegpurgetest01uuid04", "outro");
        await dbSponsorTimesAdd(db, "vseg-not-purged01", 0, 5, "vsegpurgetest01uuid05", "outro");
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [vipUserID]);
    });

    it("Reject non-VIP user", function (done) {
        postSegmentShift("vsegpurge01", "segshift_randomuser001")
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Purge all segments success", function (done) {
        postSegmentShift("vsegpurge01", privateVipUserID)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                done(await dbSponsorTimesCompareExpect(db, "vsegpurge01", 1) || await dbSponsorTimesCompareExpect(db, "vseg-not-purged01", 0));
            })
            .catch(err => done(err));
    });

    it("Should return 400 if missing body", function (done) {
        client.post(endpoint, {})
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});
