import assert from "assert";
import { db } from "../../src/databases/databases";
import { UserID } from "../../src/types/user.model";
import { getHash } from "../../src/utils/getHash";
import { getReputation, calculateReputationFromMetrics } from "../../src/utils/reputation";

describe("reputation", () => {
    // constants
    const userIDLowSubmissions = "reputation-lowsubmissions" as UserID;
    const userHashLowSubmissions = getHash(userIDLowSubmissions);
    const userIDHighDownvotes = "reputation-highdownvotes" as UserID;
    const userHashHighDownvotes = getHash(userIDHighDownvotes);
    const userIDHighNonSelfDownvotes = "reputation-highnonselfdownvotes" as UserID;
    const userHashHighNonSelfDownvotes = getHash(userIDHighNonSelfDownvotes);
    const userIDNewSubmissions = "reputation-newsubmissions" as UserID;
    const userHashNewSubmissions = getHash(userIDNewSubmissions);
    const userIDLowSum = "reputation-lowsum" as UserID;
    const userHashLowSum = getHash(userIDLowSum);
    const userIDHighRepBeforeManualVote = "reputation-oldhighrep" as UserID;
    const userHashHighRepBeforeManualVote = getHash(userIDHighRepBeforeManualVote);
    const userIDHighRep = "reputation-highrep" as UserID;
    const userHashHighRep = getHash(userIDHighRep);
    const userIDHighRepAndLocked = "reputation-highlockedrep" as UserID;
    const userHashHighAndLocked = getHash(userIDHighRepAndLocked);
    const userIDHaveMostUpvotedInLockedVideo = "reputation-mostupvotedaslocked" as UserID;
    const userHashHaveMostUpvotedInLockedVideo = getHash(userIDHaveMostUpvotedInLockedVideo);

    before(async function() {
        this.timeout(5000); // this preparation takes longer then usual
        const videoID = "reputation-videoID";
        const videoID2 = "reputation-videoID-2";

        const sponsorTimesInsertQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "hidden", "shadowHidden") VALUES(?,?,?,?,?,?,?,?,?,?,?,?)';
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-0-uuid-0", userHashLowSubmissions, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-0-uuid-1", userHashLowSubmissions, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 100, 0, "reputation-0-uuid-2", userHashLowSubmissions, 1606240000000, 50, "sponsor", 0, 0]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-1-uuid-0", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-1", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-2", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-3", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-4", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-1-uuid-5", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-uuid-6", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-uuid-7", userHashHighDownvotes, 1606240000000, 50, "sponsor", 0, 0]);

        // First video is considered a normal downvote, second is considered a self-downvote (ie. they didn't resubmit to fix their downvote)
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, 2, 0, "reputation-1-1-uuid-0", userHashHighNonSelfDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        // Different category, same video
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, -2, 0, "reputation-1-1-uuid-1", userHashHighNonSelfDownvotes, 1606240000000, 50, "intro", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-2", userHashHighNonSelfDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-3", userHashHighNonSelfDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-4", userHashHighNonSelfDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-1-1-uuid-5", userHashHighNonSelfDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-6", userHashHighNonSelfDownvotes, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-7", userHashHighNonSelfDownvotes, 1606240000000, 50, "sponsor", 0, 0]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-0", userHashNewSubmissions, Date.now(), 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-1", userHashNewSubmissions, Date.now(), 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-2", userHashNewSubmissions, Date.now(), 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-3", userHashNewSubmissions, Date.now(), 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-4", userHashNewSubmissions, Date.now(), 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-2-uuid-5", userHashNewSubmissions, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-2-uuid-6", userHashNewSubmissions, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-2-uuid-7", userHashNewSubmissions, 1606240000000, 50, "sponsor", 0, 0]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-3-uuid-0", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 1, 0, "reputation-3-uuid-1", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-2", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-3", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 1, 0, "reputation-3-uuid-4", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-3-uuid-5", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-6", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-7", userHashLowSum, 1606240000000, 50, "sponsor", 0, 0]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-0", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-1", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-2", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-3", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-4", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-4-uuid-5", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-4-uuid-6", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-4-uuid-7", userHashHighRepBeforeManualVote, 0, 50, "sponsor", 0, 0]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-0", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-1", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-2", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-3", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-4", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-5-uuid-5", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-5-uuid-6", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-5-uuid-7", userHashHighRep, 1606240000000, 50, "sponsor", 0, 0]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-0", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-1", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-2", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-3", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-6-uuid-4", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-6-uuid-5", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-6-uuid-6", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-6-uuid-7", userHashHighAndLocked, 1606240000000, 50, "sponsor", 0, 0]);

        //Record has most upvoted
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 5, 0, "reputation-7-uuid-0", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 101, 0, "reputation-7-uuid-1", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "intro", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID2, 1, 11, 5, 0, "reputation-7-uuid-8", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID2, 1, 11, 0, 0, "reputation-7-uuid-9", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        // other segments
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-2", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-3", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-4", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-7-uuid-5", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-7-uuid-6", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-7-uuid-7", userHashHaveMostUpvotedInLockedVideo, 1606240000000, 50, "sponsor", 0, 0]);

        // lock video
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-getLockCategories")]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category") VALUES (?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), videoID, "sponsor"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), videoID, "intro"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), videoID2, "sponsor"]);
    });

    it("user in grace period", async () => {
        const data = await getReputation(getHash(userIDLowSubmissions));
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
        const data = await getReputation(getHash(userIDHighDownvotes));
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, -2.125);
    });

    it("user with high non self downvote ratio", async () => {
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
        const data = await getReputation(userHashHighNonSelfDownvotes);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, -1.6428571428571428);
    });

    it("user with mostly new submissions", async () => {
        assert.strictEqual(await getReputation(userHashNewSubmissions), 0);
    });

    it("user with not enough vote sum", async () => {
        assert.strictEqual(await getReputation(userHashLowSum), 0);
    });

    it("user with lots of old votes (before autovote was disabled) ", async () => {
        assert.strictEqual(await getReputation(userHashHighRepBeforeManualVote), 0);
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
        const data = await getReputation(userHashHighRep);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, 0.19310344827586207);
    });

    it("user with high reputation and locked segments", async () => {
        const metrics = {
            totalSubmissions: 8,
            downvotedSubmissions: 1,
            nonSelfDownvotedSubmissions: 0,
            votedSum: 9,
            lockedSum: 4,
            semiOldUpvotedSubmissions: 5,
            oldUpvotedSubmissions: 5,
            mostUpvotedInLockedVideoSum: 0
        };
        const data = await getReputation(userHashHighAndLocked);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data, 1.793103448275862);
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
        const data = await getReputation(userHashHaveMostUpvotedInLockedVideo);
        assert.strictEqual(data, calculateReputationFromMetrics(metrics));
        assert.strictEqual(data,  6.158620689655172);
    });

});
