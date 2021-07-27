import assert from "assert";
import { db } from "../../src/databases/databases";
import { UserID } from "../../src/types/user.model";
import { getHash } from "../../src/utils/getHash";
import { getReputation, calculateReputationFromMetrics } from "../../src/utils/reputation";

const userIDLowSubmissions = "reputation-lowsubmissions" as UserID;
const userIDHighDownvotes = "reputation-highdownvotes" as UserID;
const userIDHighNonSelfDownvotes = "reputation-highnonselfdownvotes" as UserID;
const userIDNewSubmissions = "reputation-newsubmissions" as UserID;
const userIDLowSum = "reputation-lowsum" as UserID;
const userIDHighRepBeforeManualVote = "reputation-oldhighrep" as UserID;
const userIDHighRep = "reputation-highrep" as UserID;
const userIDHighRepAndLocked = "reputation-highlockedrep" as UserID;
const userIDHaveMostUpvotedInLockedVideo = "reputation-mostupvotedaslocked" as UserID;

describe("reputation", () => {
    before(async function() {
        this.timeout(5000); // this preparation takes longer then usual
        const videoID = "reputation-videoID";
        const videoID2 = "reputation-videoID-2";

        const sponsorTimesInsertQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-0-uuid-0", getHash(userIDLowSubmissions), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-0-uuid-1", getHash(userIDLowSubmissions), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 100, 0, "reputation-0-uuid-2", getHash(userIDLowSubmissions), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-1-uuid-0", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-1", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-2", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-3", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -2, 0, "reputation-1-uuid-4", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-1-uuid-5", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-uuid-6", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-uuid-7", getHash(userIDHighDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        // First video is considered a normal downvote, second is considered a self-downvote (ie. they didn't resubmit to fix their downvote)
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, 2, 0, "reputation-1-1-uuid-0", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        // Different category, same video
        await db.prepare("run", sponsorTimesInsertQuery, [`${videoID}A`, 1, 11, -2, 0, "reputation-1-1-uuid-1", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "intro", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-2", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-3", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-4", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-1-1-uuid-5", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-6", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-1-1-uuid-7", getHash(userIDHighNonSelfDownvotes), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-0", getHash(userIDNewSubmissions), Date.now(), 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-1", getHash(userIDNewSubmissions), Date.now(), 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-2", getHash(userIDNewSubmissions), Date.now(), 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-3", getHash(userIDNewSubmissions), Date.now(), 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-2-uuid-4", getHash(userIDNewSubmissions), Date.now(), 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-2-uuid-5", getHash(userIDNewSubmissions), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-2-uuid-6", getHash(userIDNewSubmissions), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-2-uuid-7", getHash(userIDNewSubmissions), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-3-uuid-0", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 1, 0, "reputation-3-uuid-1", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-2", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-3", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 1, 0, "reputation-3-uuid-4", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-3-uuid-5", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-6", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-3-uuid-7", getHash(userIDLowSum), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-0", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-1", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-2", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-3", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-4-uuid-4", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-4-uuid-5", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-4-uuid-6", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-4-uuid-7", getHash(userIDHighRepBeforeManualVote), 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-0", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-1", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-2", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-3", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-5-uuid-4", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-5-uuid-5", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-5-uuid-6", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-5-uuid-7", getHash(userIDHighRep), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-0", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-1", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-2", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 1, "reputation-6-uuid-3", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-6-uuid-4", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-6-uuid-5", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-6-uuid-6", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-6-uuid-7", getHash(userIDHighRepAndLocked), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        //Record has most upvoted
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 5, 0, "reputation-7-uuid-0", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 101, 0, "reputation-7-uuid-1", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "intro", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID2, 1, 11, 5, 0, "reputation-7-uuid-8", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID2, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID2, 1, 11, 0, 0, "reputation-7-uuid-9", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID2, 1)]);
        // other segments
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-2", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-3", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 2, 0, "reputation-7-uuid-4", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, -1, 0, "reputation-7-uuid-5", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-7-uuid-6", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);
        await db.prepare("run", sponsorTimesInsertQuery, [videoID, 1, 11, 0, 0, "reputation-7-uuid-7", getHash(userIDHaveMostUpvotedInLockedVideo), 1606240000000, 50, "sponsor", "YouTube", 100, 0, 0, getHash(videoID, 1)]);

        // lock video
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-getLockCategories")]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "hashedVideoID") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), videoID, "sponsor", getHash(videoID, 1)]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), videoID, "intro", getHash(videoID, 1)]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), videoID2, "sponsor", getHash(videoID2, 1)]);
    });

    it("user in grace period", async () => {
        assert.strictEqual(await getReputation(getHash(userIDLowSubmissions)), 0);
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

        assert.strictEqual(await getReputation(getHash(userIDHighDownvotes)), calculateReputationFromMetrics(metrics));
        assert.strictEqual(await getReputation(getHash(userIDHighDownvotes)), -2.125);
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
        assert.strictEqual(await getReputation(getHash(userIDHighNonSelfDownvotes)), calculateReputationFromMetrics(metrics));
        assert.strictEqual(await getReputation(getHash(userIDHighNonSelfDownvotes)), -1.6428571428571428);
    });

    it("user with mostly new submissions", async () => {
        assert.strictEqual(await getReputation(getHash(userIDNewSubmissions)), 0);
    });

    it("user with not enough vote sum", async () => {
        assert.strictEqual(await getReputation(getHash(userIDLowSum)), 0);
    });

    it("user with lots of old votes (before autovote was disabled) ", async () => {
        assert.strictEqual(await getReputation(getHash(userIDHighRepBeforeManualVote)), 0);
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
        assert.strictEqual(await getReputation(getHash(userIDHighRep)), calculateReputationFromMetrics(metrics));
        assert.strictEqual(await getReputation(getHash(userIDHighRep)), 0.19310344827586207);
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
        assert.strictEqual(await getReputation(getHash(userIDHighRepAndLocked)), calculateReputationFromMetrics(metrics));
        assert.strictEqual(await getReputation(getHash(userIDHighRepAndLocked)), 1.793103448275862);
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
        assert.strictEqual(await getReputation(getHash(userIDHaveMostUpvotedInLockedVideo)), calculateReputationFromMetrics(metrics));
        assert.strictEqual(await getReputation(getHash(userIDHaveMostUpvotedInLockedVideo)),  6.158620689655172);
    });

});
