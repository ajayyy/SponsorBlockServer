import { db } from "../../src/databases/databases";
import { IDatabase } from "../../src/databases/IDatabase";
import assert from "assert";
import { client } from "../utils/httpClient";

import { insertSegment } from "../utils/segmentQueryGen";
import { genAnonUser, genUser } from "../utils/genUser";
import { insertVipUser } from "../utils/queryGen";

async function dbSponsorTimesCompareExpect(db: IDatabase, videoId: string, expectdHidden: number) {
    const seg = await db.prepare("get", `SELECT "hidden", "UUID" FROM "sponsorTimes" WHERE "videoID" = ? AND "hidden" != ? `, [videoId, expectdHidden]);
    if (seg) return `${seg.UUID} expected to be ${expectdHidden} but found ${seg.hidden}}`;
    return;
}

describe("postPurgeAllSegments", function () {
    const endpoint = "/api/purgeAllSegments";
    const postPurgeSegments = (videoID: string, userID: string) => client.post(endpoint, { videoID, userID });
    // users
    const vipUser = genUser("postPurgeAllSegments", "vipUser");
    const randomUser = genAnonUser();
    // videos
    const purgeID = "vsegpurge01";
    const identifier = "vsegpurgetest01";

    before(async function () {
        // startTime and endTime get set in beforeEach for consistency
        await insertSegment(db, { videoID: purgeID, category: "intro" }, identifier);
        await insertSegment(db, { videoID: purgeID, category: "sponsor" }, identifier);
        await insertSegment(db, { videoID: purgeID, category: "interaction" }, identifier);
        await insertSegment(db, { videoID: purgeID, category: "outro" }, identifier);
        await insertSegment(db, { videoID: "vseg-not-purged01", category: "outro" }, identifier);
        await insertVipUser(db, vipUser);
    });

    it("Reject non-VIP user", function (done) {
        postPurgeSegments(purgeID, randomUser.privID)
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Purge all segments success", function (done) {
        postPurgeSegments(purgeID, vipUser.privID)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                done(await dbSponsorTimesCompareExpect(db, purgeID, 1) || await dbSponsorTimesCompareExpect(db, "vseg-not-purged01", 0));
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
