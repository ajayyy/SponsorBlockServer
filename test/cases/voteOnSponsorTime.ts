import fetch from "node-fetch";
import { config } from "../../src/config";
import { db } from "../../src/databases/databases";
import { Done, getbaseURL } from "../utils";
import { getHash } from "../../src/utils/getHash";
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../youtubeMock";
import assert from "assert";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("voteOnSponsorTime", () => {
    before(async () => {
        const now = Date.now();
        const warnVip01Hash = getHash("warn-vip01");
        const warnUser01Hash = getHash("warn-voteuser01");
        const warnUser02Hash = getHash("warn-voteuser02");
        const MILLISECONDS_IN_HOUR = 3600000;
        const warningExpireTime = MILLISECONDS_IN_HOUR * config.hoursAfterWarningExpires;

        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", "views", "category", "shadowHidden", "hidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimeQuery, ["vote-testtesttest", 1, 11, 2, "vote-uuid-0", "testman", 0, 50, "sponsor", 0, 0, getHash("vote-testtesttest", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-testtesttest2", 1, 11, 2, "vote-uuid-1", "testman", 0, 50, "sponsor", 0, 0, getHash("vote-testtesttest2", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-testtesttest2", 1, 11, 10, "vote-uuid-1.5", "testman", 0, 50, "outro", 0, 0, getHash("vote-testtesttest2", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-testtesttest2", 1, 11, 10, "vote-uuid-1.6", "testman", 0, 50, "interaction", 0, 0, getHash("vote-testtesttest2", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-testtesttest3", 20, 33, 10, "vote-uuid-2", "testman", 0, 50, "intro", 0, 0, getHash("vote-testtesttest3", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-testtesttest,test", 1, 11, 100, "vote-uuid-3", "testman", 0, 50, "sponsor", 0, 0, getHash("vote-testtesttest,test", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-test3", 1, 11, 2, "vote-uuid-4", "testman", 0, 50, "sponsor", 0, 0, getHash("vote-test3", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-test3", 7, 22, -3, "vote-uuid-5", "testman", 0, 50, "intro", 0, 0, getHash("vote-test3", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-test3", 7, 22, -3, "vote-uuid-5_1", "testman", 0, 50, "intro", 0, 0, getHash("vote-test3", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-multiple", 1, 11, 2, "vote-uuid-6", "testman", 0, 50, "intro", 0, 0, getHash("vote-multiple", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-multiple", 20, 33, 2, "vote-uuid-7", "testman", 0, 50, "intro", 0, 0, getHash("vote-multiple", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["voter-submitter", 1, 11, 2, "vote-uuid-8", getHash("randomID"), 0, 50, "sponsor", 0, 0, getHash("voter-submitter", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["voter-submitter2", 1, 11, 2, "vote-uuid-9", getHash("randomID2"), 0, 50, "sponsor", 0, 0, getHash("voter-submitter2", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["voter-submitter2", 1, 11, 2, "vote-uuid-10", getHash("randomID3"), 0, 50, "sponsor", 0, 0, getHash("voter-submitter2", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["voter-submitter2", 1, 11, 2, "vote-uuid-11", getHash("randomID4"), 0, 50, "sponsor", 0, 0, getHash("voter-submitter2", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["own-submission-video", 1, 11, 500, "own-submission-uuid", getHash("own-submission-id"), 0, 50, "sponsor", 0, 0, getHash("own-submission-video", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["not-own-submission-video", 1, 11, 500, "not-own-submission-uuid", getHash("somebody-else-id"), 0, 50, "sponsor", 0, 0, getHash("not-own-submission-video", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["incorrect-category", 1, 11, 500, "incorrect-category", getHash("somebody-else-id"), 0, 50, "sponsor", 0, 0, getHash("incorrect-category", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["incorrect-category-change", 1, 11, 500, "incorrect-category-change", getHash("somebody-else-id"), 0, 50, "sponsor", 0, 0, getHash("incorrect-category-change", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["vote-testtesttest", 1, 11, 2, "warnvote-uuid-0", "testman", 0, 50, "sponsor", 0, 0, getHash("vote-testtesttest", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["no-sponsor-segments-video", 1, 11, 2, "no-sponsor-segments-uuid-0", "no-sponsor-segments", 0, 50, "sponsor", 0, 0, getHash("no-sponsor-segments-video", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["no-sponsor-segments-video", 1, 11, 2, "no-sponsor-segments-uuid-1", "no-sponsor-segments", 0, 50, "intro", 0, 0, getHash("no-sponsor-segments-video", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["segment-locking-video", 1, 11, 2, "segment-locking-uuid-1", "segment-locking-user", 0, 50, "intro", 0, 0, getHash("segment-locking-video", 1)]);
        await db.prepare("run", insertSponsorTimeQuery, ["segment-hidden-video", 1, 11, 2, "segment-hidden-uuid-1", "segment-hidden-user", 0, 50, "intro", 0, 1, getHash("segment-locking-video", 1)]);

        const insertWarningQuery = 'INSERT INTO "warnings" ("userID", "issueTime", "issuerUserID", "enabled") VALUES(?, ?, ?, ?)';
        await db.prepare("run", insertWarningQuery, [warnUser01Hash, now, warnVip01Hash,  1]);
        await db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 1000), warnVip01Hash,  1]);
        await db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 2000), warnVip01Hash,  1]);
        await db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 3601000), warnVip01Hash,  1]);
        await db.prepare("run", insertWarningQuery, [warnUser02Hash, now, warnVip01Hash,  1]);
        await db.prepare("run", insertWarningQuery, [warnUser02Hash, now, warnVip01Hash,  1]);
        await db.prepare("run", insertWarningQuery, [warnUser02Hash, (now - (warningExpireTime + 1000)), warnVip01Hash,  1]);
        await db.prepare("run", insertWarningQuery, [warnUser02Hash, (now - (warningExpireTime + 2000)), warnVip01Hash,  1]);


        await db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [getHash("VIPUser")]);
        await db.prepare("run", 'INSERT INTO "shadowBannedUsers" ("userID") VALUES (?)', [getHash("randomID4")]);

        await db.prepare("run", 'INSERT INTO "lockCategories" ("videoID", "userID", "category") VALUES (?, ?, ?)', ["no-sponsor-segments-video", "someUser", "sponsor"]);
    });

    it("Should be able to upvote a segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID&UUID=vote-uuid-0&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-0"]);
                assert.strictEqual(row.votes, 3);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to downvote a segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=vote-uuid-2&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-2"]);
                assert.ok(row.votes < 10);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to downvote the same segment when voting from a different user on the same IP", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID3&UUID=vote-uuid-2&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-2"]);
                assert.strictEqual(row.votes, 9);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to downvote a segment if the user is shadow banned", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID4&UUID=vote-uuid-1.6&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-1.6"]);
                assert.strictEqual(row.votes, 10);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to upvote a segment if the user hasn't submitted yet", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=hasNotSubmittedID&UUID=vote-uuid-1&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-1"]);
                assert.strictEqual(row.votes, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to downvote a segment if the user hasn't submitted yet", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=hasNotSubmittedID&UUID=vote-uuid-1.5&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-1.5"]);
                assert.strictEqual(row.votes, 10);
                done();
            })
            .catch(err => done(err));
    });

    it("VIP should be able to completely downvote a segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=VIPUser&UUID=vote-uuid-3&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-3"]);
                assert.ok(row.votes <= -2);
                done();
            })
            .catch(err => done(err));
    });

    it("should be able to completely downvote your own segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=own-submission-id&UUID=own-submission-uuid&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["own-submission-uuid"]);
                assert.ok(row.votes <= -2);
                done();
            })
            .catch(err => done(err));
    });

    it("should not be able to completely downvote somebody elses segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=not-own-submission-uuid&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["not-own-submission-uuid"]);
                assert.strictEqual(row.votes, 499);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to vote for a category and it should add your vote to the database", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=vote-uuid-4&category=intro`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-4"]);
                const categoryRows = await db.prepare("all", `SELECT votes, category FROM "categoryVotes" WHERE "UUID" = ?`, ["vote-uuid-4"]);
                assert.strictEqual(row.category, "sponsor");
                assert.strictEqual(categoryRows.length, 2);
                assert.strictEqual(categoryRows[0].votes, 1);
                assert.strictEqual(categoryRows[0].category, "intro");
                assert.strictEqual(categoryRows[1].votes, 1);
                assert.strictEqual(categoryRows[1].category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should not able to change to an invalid category", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=incorrect-category&category=fakecategory`)
            .then(async res => {
                assert.strictEqual(res.status, 400);
                const row = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["incorrect-category"]);
                assert.strictEqual(row.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should not able to change to highlight category", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=incorrect-category&category=highlight`)
            .then(async res => {
                assert.strictEqual(res.status, 400);
                const row = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["incorrect-category"]);
                assert.strictEqual(row.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to change your vote for a category and it should add your vote to the database", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=vote-uuid-4&category=outro`)
            .then(async res => {
                if (res.status === 200) {
                    const submissionRow = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-4"]);
                    const categoryRows = await db.prepare("all", `SELECT votes, category FROM "categoryVotes" WHERE "UUID" = ?`, ["vote-uuid-4"]);
                    let introVotes = 0;
                    let outroVotes = 0;
                    let sponsorVotes = 0;
                    for (const row of categoryRows) {
                        if (row?.category === "intro") introVotes += row?.votes;
                        if (row?.category === "outro") outroVotes += row?.votes;
                        if (row?.category === "sponsor") sponsorVotes += row?.votes;
                    }
                    assert.strictEqual(submissionRow.category, "sponsor");
                    assert.strictEqual(categoryRows.length, 3);
                    assert.strictEqual(introVotes, 0);
                    assert.strictEqual(outroVotes, 1);
                    assert.strictEqual(sponsorVotes, 1);
                    done();
                } else {
                    done(`Status code was ${res.status}`);
                }
            })
            .catch(err => done(err));
    });


    it("Should not be able to change your vote to an invalid category", (done: Done) => {
        const vote = (inputCat: string, assertCat: string, callback: Done) => {
            fetch(`${getbaseURL()
            }/api/voteOnSponsorTime?userID=randomID2&UUID=incorrect-category-change&category=${inputCat}`)
                .then(async () => {
                    const row = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["incorrect-category-change"]);
                    assert.strictEqual(row.category, assertCat);
                    callback();
                })
                .catch(err => done(err));
        };
        vote("sponsor", "sponsor", () => {
            vote("fakeCategory", "sponsor", done);
        });
    });


    it("VIP should be able to vote for a category and it should immediately change", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=VIPUser&UUID=vote-uuid-5&category=outro`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-5"]);
                const row2 = await db.prepare("get", `SELECT votes FROM "categoryVotes" WHERE "UUID" = ? and category = ?`, ["vote-uuid-5", "outro"]);
                assert.strictEqual(row.category, "outro");
                assert.strictEqual(row2.votes, 500);
                done();
            })
            .catch(err => done(err));
    });

    it("Submitter should be able to vote for a category and it should immediately change", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=testman&UUID=vote-uuid-5_1&category=outro`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-5"]);
                assert.strictEqual(row.category, "outro");
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to category-vote on an invalid UUID submission", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID3&UUID=invalid-uuid&category=intro`)
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it('Non-VIP should not be able to upvote "dead" submission', (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=vote-uuid-5&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-5"]);
                assert.strictEqual(row.votes, -3);
                done();
            })
            .catch(err => done(err));
    });

    it('Non-VIP should not be able to downvote "dead" submission', (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=vote-uuid-5&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-5"]);
                assert.strictEqual(row.votes, -3);
                done();
            })
            .catch(err => done(err));
    });

    it('VIP should be able to upvote "dead" submission', (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=VIPUser&UUID=vote-uuid-5&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-5"]);
                assert.ok(row.votes > -3);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to upvote a segment (Too many warning)", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=warn-voteuser01&UUID=warnvote-uuid-0&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Non-VIP should not be able to downvote on a segment with no-segments category", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID&UUID=no-sponsor-segments-uuid-0&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["no-sponsor-segments-uuid-0"]);
                assert.strictEqual(row.votes, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Non-VIP should be able to upvote on a segment with no-segments category", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID&UUID=no-sponsor-segments-uuid-0&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["no-sponsor-segments-uuid-0"]);
                assert.strictEqual(row.votes, 3);
                done();
            })
            .catch(err => done(err));
    });

    it("Non-VIP should not be able to category vote on a segment with no-segments category", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID&UUID=no-sponsor-segments-uuid-0&category=outro`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "category" FROM "sponsorTimes" WHERE "UUID" = ?`, ["no-sponsor-segments-uuid-0"]);
                assert.strictEqual(row.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("VIP upvote should lock segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=VIPUser&UUID=segment-locking-uuid-1&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "locked" FROM "sponsorTimes" WHERE "UUID" = ?`, ["segment-locking-uuid-1"]);
                assert.strictEqual(row.locked, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("VIP downvote should unlock segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=VIPUser&UUID=segment-locking-uuid-1&type=0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "locked" FROM "sponsorTimes" WHERE "UUID" = ?`, ["segment-locking-uuid-1"]);
                assert.strictEqual(row.locked, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("VIP upvote should unhide segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=VIPUser&UUID=segment-hidden-uuid-1&type=1`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "hidden" FROM "sponsorTimes" WHERE "UUID" = ?`, ["segment-hidden-uuid-1"]);
                assert.strictEqual(row.hidden, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to undo-vote a segment", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/voteOnSponsorTime?userID=randomID2&UUID=vote-uuid-2&type=20`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, ["vote-uuid-2"]);
                assert.strictEqual(row.votes, 10);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to vote with type 10", (done: Done) => {
        fetch(`${getbaseURL()  }/api/voteOnSponsorTime?userID=VIPUser&UUID=segment-locking-uuid-1&type=10`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to vote with type 11", (done: Done) => {
        fetch(`${getbaseURL()  }/api/voteOnSponsorTime?userID=VIPUser&UUID=segment-locking-uuid-1&type=11`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});
