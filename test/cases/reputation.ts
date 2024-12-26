import assert from "assert";
import { db } from "../../src/databases/databases";
import { getReputation, calculateReputationFromMetrics } from "../../src/utils/reputation";
import { genUsers } from "../utils/genUser";

describe("reputation", () => {
    // user definitions
    const cases = [
        "locking-vip",
        "low-submissions",
        "high-downvotes",
        "low-non-self-downvotes",
        "high-non-self-downvotes",
        "new-submissions",
        "low-sum",
        "high-rep-before-manual-vote",
        "high-rep",
        "high-rep-locked",
        "have-most-upvoted-in-locked-video"
    ];
    const users = genUsers("reputation", cases);
    const isoDate = new Date().toISOString();

    before(async function() {
        this.timeout(5000); // this preparation takes longer then usual
        const videoID = "reputation-videoID";
        const videoID2 = "reputation-videoID-2";

        const sponsorTimesInsertQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "hidden", "shadowHidden", "updatedAt") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)';
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-0-uuid-0", users["low-submissions"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-0-uuid-1", users["low-submissions"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 100, 0, "reputation-0-uuid-2", users["low-submissions"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-1-uuid-0", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-1", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-2", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-3", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-4", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-1-uuid-5", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-uuid-6", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-uuid-7", users["high-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);

        // First video is considered a normal downvote, second is considered a self-downvote (ie. they didn't resubmit to fix their downvote)
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, 2, 0, "reputation-1-1-uuid-0", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        // Different category, same video
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, -2, 0, "reputation-1-1-uuid-1", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "intro", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-2", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-3", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-4", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-1-1-uuid-5", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-6", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-7", users["low-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);

        // First videos is considered a normal downvote, last is considered a self-downvote (ie. they didn't resubmit to fix their downvote)
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, 2, 0, "reputation-1-1-1-uuid-0", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        // Different category, same video
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, -2, 0, "reputation-1-1-1-uuid-1", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "intro", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}B`, 1, 11, -2, 0, "reputation-1-1-1-uuid-1-b", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "intro", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}C`, 1, 11, -2, 0, "reputation-1-1-1-uuid-1-c", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "intro", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-1-uuid-2", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-1-uuid-3", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-1-uuid-4", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-1-1-1-uuid-5", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-1-uuid-6", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-1-uuid-7", users["high-non-self-downvotes"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-0", users["new-submissions"].pubID, Date.now(), 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-1", users["new-submissions"].pubID, Date.now(), 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-2", users["new-submissions"].pubID, Date.now(), 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-3", users["new-submissions"].pubID, Date.now(), 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-4", users["new-submissions"].pubID, Date.now(), 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-2-uuid-5", users["new-submissions"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-2-uuid-6", users["new-submissions"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-2-uuid-7", users["new-submissions"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-3-uuid-0", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 1, 0, "reputation-3-uuid-1", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-2", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-3", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 1, 0, "reputation-3-uuid-4", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-3-uuid-5", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-6", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-7", users["low-sum"].pubID, 1606240000000, 50, "sponsor", 0, 0, isoDate]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-0", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-1", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-2", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-3", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-4", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-4-uuid-5", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-4-uuid-6", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-4-uuid-7", users["high-rep-before-manual-vote"].pubID, 0, 50, "sponsor", 0, 0, isoDate]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-0", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-1", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-2", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-3", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-4", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-5-uuid-5", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-5-uuid-6", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-5-uuid-7", users["high-rep"].pubID, 1606240000000, 50, "sponsor", 0, 0]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-0", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-1", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-2", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-3", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-6-uuid-4", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-6-uuid-5", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-6-uuid-6", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-6-uuid-7", users["high-rep-locked"].pubID, 1606240000000, 50, "sponsor", 0, 0]);

        //Record has most upvoted
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 5, 0, "reputation-7-uuid-0", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 101, 0, "reputation-7-uuid-1", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "intro", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID2, 1, 11, 5, 0, "reputation-7-uuid-8", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID2, 1, 11, 0, 0, "reputation-7-uuid-9", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        // other segments
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-2", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-3", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-4", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-7-uuid-5", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-7-uuid-6", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-7-uuid-7", users["have-most-upvoted-in-locked-video"].pubID, 1606240000000, 50, "sponsor", 0, 0]);

        // lock video
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID", "createdAt") VALUES (?, ?)';
        await db.prepare("run", insertVipUserQuery, [users["locking-vip"].pubID, isoDate]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [users["locking-vip"].pubID, videoID, "sponsor", isoDate, isoDate]);
        await db.prepare("run", insertLockCategoryQuery, [users["locking-vip"].pubID, videoID, "intro", isoDate, isoDate]);
        await db.prepare("run", insertLockCategoryQuery, [users["locking-vip"].pubID, videoID2, "sponsor", isoDate, isoDate]);
    });

    it("user in grace period", async () => {
        const data = await getReputation(users["low-submissions"].privID);
        assert.strictEqual(data, 0);
    });

    it("user with high downvote ratio", async () => {
        const metrics = {
            totalSubmissions: 8,
            downvotedSubmissions: 5,
            nonSelfDownvotedSubmissions: 0,
            votedSum: -7,
            lockedSum: 0,
            semiOldUpvotedSubmissions: 1,
            oldUpvotedSubmissions: 1,
            mostUpvotedInLockedVideoSum: 0
        };
        const data = await getReputation(users["high-downvotes"].pubID);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, -1.7500000000000002);
    });

    it("user with low non self downvote ratio", async () => {
        const metrics = {
            totalSubmissions: 8,
            downvotedSubmissions: 2,
            nonSelfDownvotedSubmissions: 2,
            votedSum: -1,
            lockedSum: 0,
            semiOldUpvotedSubmissions: 1,
            oldUpvotedSubmissions: 1,
            mostUpvotedInLockedVideoSum: 0
        };
        const data = await getReputation(users["low-non-self-downvotes"].pubID);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, 0);
    });

    it("user with high non self downvote ratio", async () => {
        const data = await getReputation(users["high-non-self-downvotes"].pubID);
        assert.strictEqual(data, -2.5);
    });

    it("user with mostly new submissions", async () => {
        assert.strictEqual(await getReputation(users["new-submissions"].pubID), 0);
    });

    it("user with not enough vote sum", async () => {
        assert.strictEqual(await getReputation(users["low-sum"].pubID), 0);
    });

    it("user with lots of old votes (before autovote was disabled) ", async () => {
        assert.strictEqual(await getReputation(users["high-rep-before-manual-vote"].pubID), 0);
    });

    it("user with high reputation", async () => {
        const metrics = {
            totalSubmissions: 8,
            downvotedSubmissions: 1,
            nonSelfDownvotedSubmissions: 0,
            votedSum: 9,
            lockedSum: 0,
            semiOldUpvotedSubmissions: 5,
            oldUpvotedSubmissions: 5,
            mostUpvotedInLockedVideoSum: 0
        };
        const data = await getReputation(users["high-rep"].pubID);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, 0.19310344827586207);
    });

    it("user with high reputation and locked segmentsssss", async () => {
        const metrics = {
            totalSubmissions: 8,
            downvotedSubmissions: 1,
            nonSelfDownvotedSubmissions: 0,
            votedSum: 9,
            lockedSum: 4,
            semiOldUpvotedSubmissions: 5,
            oldUpvotedSubmissions: 5,
            mostUpvotedInLockedVideoSum: 4
        };
        const data = await getReputation(users["high-rep-locked"].pubID);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, 3.393103448275862);
    });

    it("user with most upvoted segments in locked video", async () => {
        const metrics = {
            totalSubmissions: 10,
            downvotedSubmissions: 1,
            nonSelfDownvotedSubmissions: 0,
            votedSum: 116,
            lockedSum: 0,
            semiOldUpvotedSubmissions: 6,
            oldUpvotedSubmissions: 6,
            mostUpvotedInLockedVideoSum: 2
        };
        const data = await getReputation(users["have-most-upvoted-in-locked-video"].pubID);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data,  6.158620689655172);
    });

});
