import { db } from "../../src/databases/databases";
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../mocks/youtubeMock";
import assert from "assert";
import { arrayDeepEquals } from "../utils/partialDeepEquals";
import { genRandomValue, multiGenProxy } from "../utils/genRandom";
import { insertChapter, insertSegment } from "../utils/segmentQueryGen";
import { User, genAnonUser, genUser } from "../utils/genUser";
import { insertBan, insertLock, insertVipUser, insertWarning } from "../utils/queryGen";
import { assertVotes, assertCategory, assertPrivateVote, assertCategoryVotes, assertSegmentStatus, postVote, postVoteCategory, getSegmentVotes } from "../utils/voteOnSponsorTime";

// stubs
const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("voteOnSponsorTime - 4xx", () => {
    const user = genUser("vote", "4xx");
    const uuids = multiGenProxy("uuid", "vote-vip");
    let randomUUID: string;
    // before
    before (async () => {
        await insertSegment(db, { userID: user.pubID });
        await insertSegment(db, { UUID: uuids["full-4xx"], actionType: "full" });
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-categoryvote");
        await insertSegment(db, { UUID: randomUUID });
    });
    // categoryVotes
    it("Should not able to change to an invalid category", () => {
        return assertCategory(user, randomUUID, "fakecategory", "sponsor", 400);
    });
    it("Should not able to change to highlight category", () => {
        return assertCategory(user, randomUUID, "highlight", "sponsor", 400);
    });
    it("Should not able to change to chapter category", () => {
        return assertCategory(user, randomUUID, "chapter", "sponsor", 400);
    });
    // deprecated voteTypes
    const assertStatus = async (user: User, UUID: string, voteType: number, status: number) => {
        const voteRes = await postVote(user.privID, UUID, voteType);
        assert.strictEqual(voteRes.status, status);
    };
    it("Should not be able to vote with type 10", () => {
        return assertStatus(user, randomUUID, 10, 400);
    });
    it("Should not be able to vote with type 11", () => {
        return assertStatus(user, randomUUID, 11, 400);
    });
    // invalid category-votes
    it("Should not be able to category-vote on an invalid UUID submission", async () => {
        const UUID = "invalid-uuid";
        const voteRes = await postVoteCategory(user.privID, UUID, "intro");
        return assert.strictEqual(voteRes.status, 404);
    });
    it("Should not be able to category-vote on a full video segment", async () => {
        const voteRes = await postVoteCategory(user.privID, uuids["full-4xx"], "selfpromo");
        return assert.strictEqual(voteRes.status, 400);
    });
    it("Should not be able to change your vote to an invalid category", async () => {
        await assertCategory(user, randomUUID, "sponsor", "sponsor");
        return assertCategory(user, randomUUID, "fakecategory", "sponsor", 400);
    });
});

describe("voteOnSponsorTime - No Previous Submissions", () => {
    // constants
    const uuid = "uuid-vote-unchanged";
    // helpers
    const assertSegmentNotChanged = async (user: User, vote: number) => {
        const uuid = "uuid-vote-unchanged";
        const voteRes = await postVote(user.privID, uuid, vote);
        assert.strictEqual(voteRes.status, 200);
        const row = await getSegmentVotes(uuid);
        assert.strictEqual(row.votes, 0);
    };
    // before
    before(async () => {
        await insertSegment(db, { UUID: uuid });
    });
    // tests
    it("Should not be able to downvote or upvote a segment if the user hasn't submitted yet", () => {
        const hasNotSubmitted = genAnonUser();
        assertSegmentNotChanged(hasNotSubmitted, 0);
        assertSegmentNotChanged(hasNotSubmitted, 1);
    });
});

describe("voteOnSponsorTime - VIP", () => {
    const vipUser = genUser("vote", "vip");
    const uuids = multiGenProxy("uuid", "vote-vip");
    let randomUUID: string;
    // before
    before (async () => {
        await insertVipUser(db, vipUser);
        await insertSegment(db, { UUID: uuids["locked"], locked: true });
        await insertSegment(db, { UUID: uuids["hidden"], hidden: true });
        await insertSegment(db, { UUID: uuids["dead"], votes: -2 });
        await insertSegment(db, { UUID: uuids["duration-update"], videoID: "duration-update", videoDuration: 1000 });
        await insertSegment(db, { UUID: uuids["category-locked"], locked: true });
        // nextCategory locked
        await insertLock(db, { videoID: "next-locked", actionType: "skip", category: "outro" });
        await insertSegment(db, { videoID: "next-locked", UUID: uuids["next-locked"] });
        // nextCategory, segment locked
        await insertLock(db, { videoID: "locked-next-locked", actionType: "skip", category: "intro" });
        await insertSegment(db, { videoID: "locked-next-locked", UUID: uuids["locked-next-locked"], locked: true });
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-vip");
        await insertSegment(db, { UUID: randomUUID });
    });
    // voting
    it("VIP should be able to completely downvote a segment", () => {
        return assertVotes(vipUser, randomUUID, 0, -2);
    });
    // locking/ hiding
    it("VIP upvote should lock segment", () => {
        return assertSegmentStatus(vipUser, randomUUID, 1, "locked", 1);
    });
    it("VIP downvote should unlock segment", () => {
        return assertSegmentStatus(vipUser, uuids["locked"], 0, "locked", 0);
    });
    it("VIP upvote should unhide segment", () => {
        return assertSegmentStatus(vipUser, uuids["hidden"], 1, "hidden", 0);
    });
    // dead submissions
    it('VIP upvote should bring back "dead" submission', () => {
        return assertVotes(vipUser, uuids["dead"], 1, -1);
    });
    // video duration
    it("VIP upvote should updated videoDuration", () => {
        return assertSegmentStatus(vipUser, uuids["duration-update"], 1, "videoDuration", 500);
    });
    // category change
    it("VIP vote for category should change (segment unlocked, nextCatgeory unlocked, VIP)", () => {
        return assertCategory(vipUser, randomUUID, "outro", "outro");
    });
    it("VIP vote for category should change (segment locked, nextCatgeory unlocked, VIP)", () => {
        return assertCategory(vipUser, uuids["category-locked"], "outro", "outro");
    });
    it("VIP vote for category should change (segment unlocked, nextCatgeory locked, VIP)", () => {
        return assertCategory(vipUser, uuids["next-locked"], "outro", "outro");
    });
    it("VIP vote for a category should change (segment locked, nextCatgeory locked, VIP)", () => {
        return assertCategory(vipUser, uuids["locked-next-locked"], "intro", "intro");
    });
});

describe("voteOnSponsorTime - user with submissions", () => {
    const user = genUser("vote", "userWithSubmissions");
    const uuids = multiGenProxy("uuid", "vote-usersubs");
    const videoIDs = multiGenProxy("video", "vote-usersubs");
    let randomUUID: string;
    // before
    before (async () => {
        await insertSegment(db, { userID: user.pubID }); // user has submission
        await insertChapter(db, "", { userID: user.pubID }); // user has chapters
        await insertSegment(db, { UUID: uuids["same-ip"], votes: 10 });
        await insertChapter(db, "", { UUID: uuids["chapter"] });
        await insertSegment(db, { UUID: uuids["full-video-dead"], actionType: "full", votes: -2 });
        // ajacent segment lock
        await insertLock(db, { videoID: videoIDs["locked-sponsor"], actionType: "skip", category: "sponsor" });
        await insertSegment(db, { videoID: videoIDs["locked-sponsor"], UUID: uuids["locked-sponsor"], actionType: "mute" });
        // category change vote
        await insertSegment(db, { UUID: uuids["category-change"], category: "sponsor" });
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-usersubs");
        await insertSegment(db, { UUID: randomUUID });
    });
    // tests
    it("Should be able to upvote a segment", () => {
        return assertVotes(user, randomUUID, 1, 1);
    });
    it ("Should be able to downvote a segment", async () => {
        await assertVotes(user, uuids["same-ip"], 0, 9);
        return assertPrivateVote(user, uuids["same-ip"], 0);
    });
    it("Should be able to downvote segment with ajacent actionType lock", () => {
        return assertVotes(user, uuids["locked-sponsor"], 0, -1);
    });
    it ("Should not be able to completely downvote somebody elses segment", () => {
        return assertVotes(user, randomUUID, 0, -1);
    });
    it("Should not be able to downvote the same segment when voting from a different user on the same IP", () => {
        return assertVotes(genAnonUser(), uuids["same-ip"], 0, 9);
    });
    // dead segment
    it("Should be able to revive full video segment as non-vip", () => {
        return assertVotes(user, uuids["full-video-dead"], 1, -1);
    });
    // malicious votes
    // user needs chapter submissions to malicious vote chapters
    it("Should be able to completely downvote chapter using malicious", () => {
        return assertVotes(user, uuids["chapter"], 30, -2);
    });
    it("Should not be able to completely downvote non-chapter using malicious", () => {
        return assertVotes(user, randomUUID, 30, 0);
    });
    // category votes
    it("Should be able to change your vote for a category and it should add your vote to the database (segment unlocked, nextCatgeory unlocked)", async () => {
        const uuid = uuids["category-change"];
        await assertCategory(user, uuid, "outro", "sponsor"); // vote for change
        return assertCategoryVotes(uuid, "outro", 1);
    });
});

describe("voteOnSponsorTime - category votes", () => {
    // before
    const originalCategory = "sponsor";
    let voteForChange: (targetCategory: string, expectedCategory: string, count: number) => Promise<void>;
    beforeEach (async () => {
        const randomUUID = genRandomValue("uuid", "vote-category");
        // create segment
        await insertSegment(db, { UUID: randomUUID, category: "sponsor", votes: 1 });
        voteForChange = async (targetCategory: string, expectedCategory: string, count: number) => {
            // insert user for eligibility
            const user = genUser("vote", "category-vote");
            await insertSegment(db, { userID: user.pubID });
            // vote
            await assertCategory(user, randomUUID, targetCategory, expectedCategory);
            await assertCategoryVotes(randomUUID, targetCategory, count);
        };
    });
    // tests
    it("Three votes should change the category", async () => {
        const targetCategory = "outro";
        await voteForChange(targetCategory, originalCategory, 1);
        await voteForChange(targetCategory, originalCategory, 2);
        await voteForChange(targetCategory, targetCategory, 3); // commit to change
    });
    it("2x2 votes should not change the category", async () => {
        await voteForChange("outro", originalCategory, 1);
        await voteForChange("outro", originalCategory, 2);
        await voteForChange("intro", originalCategory, 1);
        await voteForChange("intro", originalCategory, 2);
    });
    it("Three eventual votes should change the category", async () => {
        await voteForChange("outro", originalCategory, 1);
        await voteForChange("outro", originalCategory, 2);
        await voteForChange("intro", originalCategory, 1);
        await voteForChange("intro", originalCategory, 2);
        await voteForChange("outro", "outro", 3); // commit to change
    });
    it("More votes should flip the category", async () => {
        const firstTarget = "outro";
        const secondTarget = "intro";
        await voteForChange(firstTarget, originalCategory, 1);
        await voteForChange(firstTarget, originalCategory, 2);
        await voteForChange(firstTarget, firstTarget, 3); // commit to change
        await voteForChange(secondTarget, firstTarget, 1);
        await voteForChange(secondTarget, firstTarget, 2);
        await voteForChange(secondTarget, firstTarget, 3);
        await voteForChange(secondTarget, firstTarget, 4); // match
        await voteForChange(secondTarget, secondTarget, 5); // overcome by 2
    });
});

describe("voteOnSponsorTime - changing votes", () => {
    const user = genUser("vote", "changing-user");
    let randomUUID: string;
    const uuids = multiGenProxy("uuid", "vote-changing");
    // before
    before (async () => {
        await insertSegment(db, { userID: user.pubID }); // user has submission
        await insertChapter(db, "", { userID: user.pubID }); // user has chapter submission
        await insertChapter(db, "chaptername", { UUID: uuids["chapter-undo"] });
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: randomUUID });
    });
    // tests
    // undovote
    it("Should be able to undo-vote upvote", async () => {
        await assertVotes(user, randomUUID, 1, 1); // upvote
        return assertVotes(user, randomUUID, 20, 0); // undo-vote
    });
    it("Should be able to undo-vote downvote", async () => {
        await assertVotes(user, randomUUID, 0, -1); // downvote
        return assertVotes(user, randomUUID, 20, 0); // undo-vote
    });
    it("Should be able to undo-vote killing vote", async () => {
        const uuid = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: uuid, votes: -1 });
        await assertVotes(user, uuid, 0, -2); // downvote
        return assertVotes(user, uuid, 20, -1); // undo-vote
    });
    it("Should be able to override undo vote with upvote", async () => {
        const uuid = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: uuid, votes: -1 });
        await assertVotes(user, uuid, 0, -2); // downvote
        await assertVotes(user, uuid, 20, -1); // undo-vote
        await assertVotes(user, uuid, 1, 0); // upvote
    });
    it("Should be able to override undo vote with downvote", async () => {
        const uuid = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: uuid, votes: -1 });
        await assertVotes(user, uuid, 0, -2); // downvote
        await assertVotes(user, uuid, 20, -1); // undo-vote
        await assertVotes(user, uuid, 0, -2); // downvote
    });
    it("Should be able to continuously undo vote (SLOW)", async () => {
        const times = Math.ceil(Math.random() * 10);
        const finalVote = (times%2 == 0) ? 0 : 1;
        for (let i = 0; i < times; i++) {
            if (i%2 == 0) {
                await assertVotes(user, randomUUID, 1, 1); // upvote
            } else {
                await assertVotes(user, randomUUID, 20, 0); // undo-vote
            }
        }
        const votes = await getSegmentVotes(randomUUID);
        assert.strictEqual(Number(votes.votes), finalVote);
    });
    it("Should be able to undo malicious vote", async () => {
        await assertVotes(user, uuids["chapter-undo"], 30, -2); // malicious downvote
        return assertVotes(user, uuids["chapter-undo"], 20, 0); // undo-vote
    });
});

describe("voteOnSponsorTime - changing votes: VIP", () => {
    const user = genUser("vote", "changing-vip");
    let randomUUID: string;
    const uuids = multiGenProxy("uuid", "vote-changing-vip");
    // before
    before (async () => {
        await insertVipUser(db, user);
        await insertChapter(db, "chaptername", { UUID: uuids["chapter-undo"] });
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: randomUUID });
    });
    // tests
    // undovote
    it("Should be able to undo-vote upvote", async () => {
        await assertVotes(user, randomUUID, 1, 1); // upvote
        return assertVotes(user, randomUUID, 20, 0); // undo-vote
    });
    it("Should be able to undo-vote downvote", async () => {
        await assertVotes(user, randomUUID, 0, -2); // downvote
        return assertVotes(user, randomUUID, 20, 0); // undo-vote
    });
    it("Should be able to undo-vote killing vote", async () => {
        const uuid = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: uuid, votes: -1 });
        await assertVotes(user, uuid, 0, -2); // downvote
        return assertVotes(user, uuid, 20, -1); // undo-vote
    });
    it("Should be able to override undo vote with upvote", async () => {
        const uuid = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: uuid, votes: -1 });
        await assertVotes(user, uuid, 0, -2); // downvote
        await assertVotes(user, uuid, 20, -1); // undo-vote
        await assertVotes(user, uuid, 1, 0); // upvote
    });
    it("Should be able to override undo vote with downvote", async () => {
        const uuid = genRandomValue("uuid", "vote-changing");
        await insertSegment(db, { UUID: uuid, votes: -1 });
        await assertVotes(user, uuid, 0, -2); // downvote
        await assertVotes(user, uuid, 20, -1); // undo-vote
        await assertVotes(user, uuid, 0, -2); // downvote
    });
    it("Should be able to continuously undo vote (SLOW)", async () => {
        const times = Math.ceil(Math.random() * 10);
        const finalVote = (times%2 == 0) ? 0 : 1;
        for (let i = 0; i < times; i++) {
            if (i%2 == 0) {
                await assertVotes(user, randomUUID, 1, 1); // upvote
            } else {
                await assertVotes(user, randomUUID, 20, 0); // undo-vote
            }
        }
        const votes = await getSegmentVotes(randomUUID);
        assert.strictEqual(Number(votes.votes), finalVote);
    });
    it("Should be able to undo malicious vote", async () => {
        await assertVotes(user, uuids["chapter-undo"], 30, -2); // malicious downvote
        return assertVotes(user, uuids["chapter-undo"], 20, 0); // undo-vote
    });
});

describe("voteOnSponsorTime - duration change", () => {
    const user = genUser("vote", "userWithSubmissions");
    const videoID = "duration-changed";
    const uuids = multiGenProxy("uuid", "vote-usersubs");
    // before
    before (async () => {
        await insertSegment(db, { userID: user.pubID }); // user has submission
        //
        await insertSegment(db, { UUID: uuids["duration-changed-1"], videoID, timeSubmitted: 10 });
        await insertSegment(db, { UUID: uuids["duration-changed-2"], videoID, timeSubmitted: 20, videoDuration: 150 });
        await insertSegment(db, { UUID: uuids["duration-changed-3"], videoID, timeSubmitted: 30 });
    });
    // tests
    it("Should hide changed submission on any downvote", async () => {
        const UUID = uuids["duration-changed-3"];
        const videoID = "duration-changed";
        await assertVotes(user, UUID, 0, -1);
        const hiddenSegments = await db.prepare("all", `SELECT "UUID" FROM "sponsorTimes" WHERE "videoID" = ? AND "hidden" = 1`, [videoID]);
        const expected = [{
            "UUID": uuids["duration-changed-1"]
        }, {
            "UUID": uuids["duration-changed-2"],
        }];
        assert.strictEqual(hiddenSegments.length, 2);
        assert.ok(arrayDeepEquals(hiddenSegments, expected));
    });
});

describe("voteOnSponsorTime - warned", () => {
    const user = genUser("vote", "warned");
    let randomUUID: string;
    // before
    before (async () => {
        await insertWarning(db, user.pubID, { issueTime: Date.now() }); // active warning
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-shadowbanned");
        await insertSegment(db, { UUID: randomUUID });
    });
    // tests
    it("Should not be able to vote for a category of a segment (Too many warning)", () => {
        return assertCategory(user, randomUUID, "outro", "sponsor", 403);
    });
    it("Should not be able to upvote a segment (Too many warning)", () => {
        return assertVotes(user, randomUUID, 1, 0, 403);
    });
});

describe("voteOnSponsorTime - shadowbanned", () => {
    const user = genUser("vote", "shadowbanned");
    let randomUUID: string;
    // before
    before (async () => {
        await insertBan(db, user.pubID);
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-shadowbanned");
        await insertSegment(db, { UUID: randomUUID });
    });
    // tests
    it("Should not be able to downvote a segment", () => {
        return assertVotes(user, randomUUID, 0, 0);
    });
    it ("Should not be able to upvote a segment", () => {
        return assertVotes(user, randomUUID, 1, 0);
    });
    it("Should be able to vote for a category as a shadowbanned user, but it shouldn't add your vote to the database", async () => {
        await assertCategory(user, randomUUID, "outro", "sponsor"); // should pass
        assertCategoryVotes(randomUUID, "outro", 1)
            .then(() => assert.fail())
            .catch(err => assert.strictEqual(err.message, "vote for category outro not found"));
    });
});

describe("voteOnSponsorTime - vote restrictions", () => {
    let newUUID: string, videoID: string;
    const user = genUser("vote", "vote-restricted");
    // before
    beforeEach(() => {
        newUUID = genRandomValue("uuid", "vote-restricted");
        videoID = genRandomValue("video", "vote-restricted");
    });
    // pass
    it("Should be able to upvote (same category", async () => {
        const category = "outro";
        await insertSegment(db, { category, videoID, userID: user.pubID }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID  }); // vote target submission
        return assertVotes(user, newUUID, 1, 1);
    });
    it("Should be able to downvote (same category)", async () => {
        const category = "intro";
        await insertSegment(db, { category, videoID, userID: user.pubID }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID }); // vote target submission
        return assertVotes(user, newUUID, 0, -1);
    });
    it("Should be able to upvote (same category different action)", async () => {
        const category = "selfpromo";
        await insertSegment(db, { category, videoID, userID: user.pubID, actionType: "mute" }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID }); // vote target submission
        return assertVotes(user, newUUID, 1, 1);
    });
    it("Should be able to downvote (same category different action)", async () => {
        const category = "selfpromo";
        await insertSegment(db, { category, videoID, userID: user.pubID, actionType: "mute" }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID }); // vote target submission
        return assertVotes(user, newUUID, 0, -1);
    });
    // fail
    it("Should not be able to upvote (only submission in category downvoted)", async () => {
        const category = "interaction";
        await insertSegment(db, { category, videoID, userID: user.pubID, votes: -2 }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID }); // vote target submission
        return assertVotes(user, newUUID, 1, 0);
    });
    it("Should not be able to downvote (only submission in category downvoted)", async () => {
        const category = "interaction";
        await insertSegment(db, { category, videoID, userID: user.pubID, votes: -2 }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID }); // vote target submission
        return assertVotes(user, newUUID, 0, 0);
    });
    it("Should not be able to upvote (only submission in category hidden)", async () => {
        const category = "filler";
        await insertSegment(db, { category, videoID, userID: user.pubID, hidden: true }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID }); // vote target submission
        return assertVotes(user, newUUID, 1, 0);
    });
    it("Should not be able to downvote (only submission in category hidden)", async () => {
        const category = "filler";
        await insertSegment(db, { category, videoID, userID: user.pubID, hidden: true }); // existing submission
        await insertSegment(db, { category, videoID, UUID: newUUID }); // vote target submission
        return assertVotes(user, newUUID, 0, 0);
    });
});

describe("voteOnSponsorTime - ownSubmission", () => {
    const user = genUser("vote", "own-submission");
    const uuids = multiGenProxy("uuid", "vote-ownsubmission");
    const videoIDs = multiGenProxy("video", "vote-ownsubmission");
    let randomUUID: string;
    // before
    before (async () => {
        // locked segment
        await insertSegment(db, { UUID: uuids["locked"], userID: user.pubID, locked: true });
        // nextCategory locked
        await insertSegment(db, { videoID: videoIDs["next-locked"],  UUID: uuids["next-locked"], userID: user.pubID });
        await insertLock(db, { videoID: videoIDs["next-locked"], actionType: "skip", category: "intro" });
        // locked, nextCategory locked
        await insertSegment(db, { videoID: videoIDs["locked-next-locked"], UUID: uuids["locked-next-locked"], userID: user.pubID, locked: true });
        await insertLock(db, { videoID: videoIDs["locked-next-locked"], actionType: "skip", category: "outro" });
    });
    beforeEach(async () => {
        randomUUID = genRandomValue("uuid", "vote-ownsubmission");
        await insertSegment(db, { UUID: randomUUID, userID: user.pubID });
    });
    // tests
    it("should be able to completely downvote your own segment (unlocked)", () => {
        return assertVotes(user, randomUUID, 0, -2);
    });
    // category votes
    it("Submitter's vote on category should work (segment unlocked, nextCatgeory unlocked, notVip)", () => {
        return assertCategory(user, randomUUID, "outro", "outro");
    });
    it("Submitter's vote on category should not work (segment locked, nextCatgeory unlocked, notVip)", () => {
        return assertCategory(user, uuids["locked"], "outro", "sponsor");
    });
    it("Submitter's vote on category should not work (segment unlocked, nextCatgeory locked, notVip)", () => {
        return assertCategory(user, uuids["next-locked"], "intro", "sponsor");
    });
    it("Submitter's vote on category should not work (segment locked, nextCatgeory locked, notVip)", () => {
        return assertCategory(user, uuids["locked-next-locked"], "outro", "sponsor");
    });
});

describe("voteOnSponsorTime - dead-segments", () => {
    const user = genUser("vote", "dead-segments");
    const deadUUID = genRandomValue("uuid", "vote-dead");
    // before
    before (async () => {
        await insertSegment(db, { userID: user.pubID });
        await insertSegment(db, { UUID: deadUUID, votes: -2 });
    });
    // tests
    it('normal user should not be able to upvote "dead" submission', () => {
        return assertVotes(user, deadUUID, 1, -2, 403);
    });
    it('normal user should not be able to downvote "dead" submission', () => {
        return assertVotes(user, deadUUID, 0, -2);
    });
});

describe("voteOnSponsorTime - locked", () => {
    const user = genUser("vote", "locked");
    const lockedVideo = genRandomValue("video", "vote-locked");
    const lockedUUID = genRandomValue("uuid", "vote-locked");
    // before
    before (async () => {
        await insertSegment(db, { userID: user.pubID });
        await insertLock(db, { videoID: lockedVideo, actionType: "skip", category: "sponsor" });
        await insertSegment(db, { videoID: lockedVideo, UUID: lockedUUID });
    });
    // tests
    it("normal user should not be able to downvote on a segment on a locked video+category", () => {
        return assertVotes(user, lockedUUID, 0, 0);
    });
    it("normal user should be able to upvote on a segment on a locked video+category", () => {
        return assertVotes(user, lockedUUID, 1, 1);
    });
    it("normal user should not be able to category vote on a segment on a locked video+category", () => {
        return assertCategory(user, lockedUUID, "outro", "sponsor");
    });
});