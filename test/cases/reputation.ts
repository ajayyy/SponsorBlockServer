import assert from 'assert';
import { db } from '../../src/databases/databases';
import { UserID } from '../../src/types/user.model';
import { getHash } from '../../src/utils/getHash';
import { getReputation } from '../../src/utils/reputation';

const userIDLowSubmissions = "reputation-lowsubmissions" as UserID;
const userIDHighDownvotes = "reputation-highdownvotes" as UserID;
const userIDHighNonSelfDownvotes = "reputation-highnonselfdownvotes" as UserID;
const userIDNewSubmissions = "reputation-newsubmissions" as UserID;
const userIDLowSum = "reputation-lowsum" as UserID;
const userIDHighRepBeforeManualVote = "reputation-oldhighrep" as UserID;
const userIDHighRep = "reputation-highrep" as UserID;
const userIDHighRepAndLocked = "reputation-highlockedrep" as UserID;

describe('reputation', () => {
    before(async () => {
        const videoID = "reputation-videoID";

        let startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", views, category, "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID") VALUES';
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-0-uuid-0', '${getHash(userIDLowSubmissions)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-0-uuid-1', '${getHash(userIDLowSubmissions)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 100, 0, 'reputation-0-uuid-2', '${getHash(userIDLowSubmissions)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-1-uuid-0', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -2, 0, 'reputation-1-uuid-1', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -2, 0, 'reputation-1-uuid-2', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -2, 0, 'reputation-1-uuid-3', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -2, 0, 'reputation-1-uuid-4', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -1, 0, 'reputation-1-uuid-5', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-1-uuid-6', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-1-uuid-7', '${getHash(userIDHighDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);

        // Each downvote is on a different video (ie. they didn't resubmit to fix their downvote)
        await db.prepare("run", startOfQuery + `('${videoID}A', 1, 11, 2, 0, 'reputation-1-1-uuid-0', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        // Different category, same video
        await db.prepare("run", startOfQuery + `('${videoID}A', 1, 11, -2, 0, 'reputation-1-1-uuid-1', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'intro', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-1-1-uuid-2', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-1-1-uuid-3', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-1-1-uuid-4', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -1, 0, 'reputation-1-1-uuid-5', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-1-1-uuid-6', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-1-1-uuid-7', '${getHash(userIDHighNonSelfDownvotes)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
    
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-2-uuid-0', '${getHash(userIDNewSubmissions)}', ${Date.now()}, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-2-uuid-1', '${getHash(userIDNewSubmissions)}', ${Date.now()}, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-2-uuid-2', '${getHash(userIDNewSubmissions)}', ${Date.now()}, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-2-uuid-3', '${getHash(userIDNewSubmissions)}', ${Date.now()}, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-2-uuid-4', '${getHash(userIDNewSubmissions)}', ${Date.now()}, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -1, 0, 'reputation-2-uuid-5', '${getHash(userIDNewSubmissions)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-2-uuid-6', '${getHash(userIDNewSubmissions)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-2-uuid-7', '${getHash(userIDNewSubmissions)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);

        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-3-uuid-0', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 1, 0, 'reputation-3-uuid-1', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-3-uuid-2', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-3-uuid-3', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 1, 0, 'reputation-3-uuid-4', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -1, 0, 'reputation-3-uuid-5', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-3-uuid-6', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-3-uuid-7', '${getHash(userIDLowSum)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);

        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-4-uuid-0', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-4-uuid-1', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-4-uuid-2', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-4-uuid-3', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-4-uuid-4', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -1, 0, 'reputation-4-uuid-5', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-4-uuid-6', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-4-uuid-7', '${getHash(userIDHighRepBeforeManualVote)}', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);

        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-5-uuid-0', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-5-uuid-1', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-5-uuid-2', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-5-uuid-3', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-5-uuid-4', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -1, 0, 'reputation-5-uuid-5', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-5-uuid-6', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-5-uuid-7', '${getHash(userIDHighRep)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
    
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 1, 'reputation-6-uuid-0', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 1, 'reputation-6-uuid-1', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 1, 'reputation-6-uuid-2', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 1, 'reputation-6-uuid-3', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 2, 0, 'reputation-6-uuid-4', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, -1, 0, 'reputation-6-uuid-5', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-6-uuid-6', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
        await db.prepare("run", startOfQuery + `('${videoID}', 1, 11, 0, 0, 'reputation-6-uuid-7', '${getHash(userIDHighRepAndLocked)}', 1606240000000, 50, 'sponsor', 'YouTube', 100, 0, 0, '${getHash(videoID, 1)}')`);
    });

    it("user in grace period", async () => {
        assert.strictEqual(await getReputation(getHash(userIDLowSubmissions)), 0);
    });

    it("user with high downvote ratio", async () => {
        assert.strictEqual(await getReputation(getHash(userIDHighDownvotes)), -2.125);
    });

    it("user with high non self downvote ratio", async () => {
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
        assert.strictEqual(await getReputation(getHash(userIDHighRep)), 0.24137931034482757);
    });

    it("user with high reputation and locked segments", async () => {
        assert.strictEqual(await getReputation(getHash(userIDHighRepAndLocked)), 1.8413793103448277);
    });

});