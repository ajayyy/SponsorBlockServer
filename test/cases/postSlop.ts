import { arrayPartialDeepEquals, partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { BloomFilterID } from "../../src/utils/bloomFilter";
import { checkBloom } from "../utils/bloomTest";


export type Segment = {
    segment: number[];
    category: string;
    actionType?: string;
    description?: string;
};

const endpoint = "/api/slop";
export const postSlop = (data: Record<string, any>) => client({
    method: "POST",
    url: endpoint,
    data
});

describe("postSlop", () => {
    // Constant and helpers
    const submitUserOne = `PostSkipUser1${".".repeat(18)}`;
    const submitUserTwo = `PostSkipUser2${".".repeat(18)}`;

    const queryDatabase = (contentID: string) => db.prepare("all", `SELECT * FROM "slopVotes" WHERE "contentID" = ? ORDER BY "id" ASC`, [contentID]);
    const queryRatings = (contentID: string) => db.prepare("all", `SELECT * FROM "slopVoteSubmissions" WHERE "contentID" = ? AND "id" = 10000 ORDER BY "comment" ASC`, [contentID]);
    const queryForBloom = (bloomID: number) => db.prepare("get", `SELECT * FROM "slopBloom" WHERE "id" = ?`, [bloomID]) as Promise<{data: Buffer, timeGenerated: number}>;

    it("Should be make a submission", (done) => {
        const contentID = "youtube.com-postSlop1";
        const profileID = "hi";
        postSlop({
            userID: submitUserOne,
            contentID,
            profileID,
            votes: [
                "ai-script",
                "ai-music"
            ],
            comment: "test",
            wholeProfile: false
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(contentID);
                const expected = [{
                    contentID,
                    profileID,
                    id: 100,
                    count: 1,
                    wholeProfile: 0
                }, {
                    contentID,
                    profileID,
                    id: 110,
                    count: 1,
                    wholeProfile: 0
                }];
                assert.ok(arrayPartialDeepEquals(row, expected));

                const ratings = await queryRatings(contentID);
                const expectedRating = {
                    comment: "test"
                };
                assert.ok(partialDeepEquals(ratings[0], expectedRating));

                const bloom = await queryForBloom(BloomFilterID.contentLeft);
                assert.ok(checkBloom(bloom.data, contentID));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to change submission", (done) => {
        const contentID = "youtube.com-postSlop1";
        const profileID = "hi";
        postSlop({
            userID: submitUserOne,
            contentID,
            profileID,
            votes: [
                "ai-script",
                "ai-graphics-most"
            ],
            wholeProfile: false
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(contentID);
                const expected = [{
                    contentID,
                    profileID,
                    id: 100,
                    count: 1,
                    wholeProfile: 0
                }, {
                    contentID,
                    profileID,
                    id: 130,
                    count: 1,
                    wholeProfile: 0
                }];
                assert.ok(arrayPartialDeepEquals(row, expected));

                const ratings = await queryRatings(contentID);
                assert.equal(ratings.length, 0);

                const bloom = await queryForBloom(BloomFilterID.contentLeft);
                assert.ok(checkBloom(bloom.data, contentID));

                const profileBloom = await queryForBloom(BloomFilterID.profileLeft);
                assert.ok(!profileBloom?.data || !checkBloom(profileBloom.data, profileID));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able submit on contentID already having a submission", (done) => {
        const contentID = "youtube.com-postSlop1";
        const profileID = "hi";
        postSlop({
            userID: submitUserTwo,
            contentID,
            profileID,
            votes: [
                "ai-thumbnail",
                "ai-graphics-most"
            ],
            wholeProfile: true
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(contentID);
                const expected = [{
                    contentID,
                    profileID,
                    id: 100,
                    count: 1,
                    wholeProfile: 0
                }, {
                    contentID,
                    profileID,
                    id: 120,
                    count: 1,
                    wholeProfile: 1
                }, {
                    contentID,
                    profileID,
                    id: 130,
                    count: 2,
                    wholeProfile: 1
                }];
                assert.ok(arrayPartialDeepEquals(row, expected));

                const profileBloom = await queryForBloom(BloomFilterID.profileLeft);
                assert.ok(checkBloom(profileBloom.data, profileID));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to undo a vote and have it removed from the bloom", async () => {
        const contentID = "youtube.com-postSlop2";
        const profileID = "hi";

        const submission1 = await postSlop({
            userID: submitUserTwo,
            contentID,
            profileID,
            votes: [
                "ai-thumbnail",
                "ai-graphics-most"
            ],
            wholeProfile: false
        });

        assert.strictEqual(submission1.status, 200);

        const bloom = await queryForBloom(BloomFilterID.contentLeft);
        assert.ok(checkBloom(bloom.data, contentID));

        const submission2 = await postSlop({
            userID: submitUserTwo,
            contentID,
            profileID,
            votes: [
                "human"
            ],
            wholeProfile: 0
        });

        assert.strictEqual(submission2.status, 200);

        const bloom2 = await queryForBloom(BloomFilterID.contentLeft);
        assert.equal(checkBloom(bloom2.data, contentID), false);
    });

    it("Should be able to undo a vote and have it removed from the bloom without affecting conflicts", async () => {
        const contentID = "youtube.com-conflict-test";
        const collisionContentID = "youtube.com-conflict-test0.07762739322302725";

        await postSlop({
            userID: submitUserTwo,
            contentID,
            votes: [
                "ai-thumbnail",
                "ai-graphics-most"
            ],
            wholeProfile: false
        });

        {
            const bloom = await queryForBloom(BloomFilterID.contentLeft);
            assert.ok(checkBloom(bloom.data, contentID));
        }

        await postSlop({
            userID: submitUserTwo,
            contentID: collisionContentID,
            votes: [
                "ai-thumbnail",
                "ai-graphics-most"
            ],
            wholeProfile: false
        });

        {
            const bloom = await queryForBloom(BloomFilterID.contentLeft);
            assert.ok(checkBloom(bloom.data, contentID));
        }

        {
            const bloom = await queryForBloom(BloomFilterID.contentLeft);
            assert.ok(checkBloom(bloom.data, collisionContentID));
        }

        // Undo vote on one of the contentIDs
        await postSlop({
            userID: submitUserTwo,
            contentID,
            votes: [
                "human"
            ],
            wholeProfile: false
        });

        {
            const bloom = await queryForBloom(BloomFilterID.contentLeft);
            assert.equal(checkBloom(bloom.data, contentID), false);
        }

        // Ensure collision is still valid in the bloom
        {
            const bloom = await queryForBloom(BloomFilterID.contentLeft);
            assert.ok(checkBloom(bloom.data, collisionContentID));
        }
    });

    [{
        req: {
            votes: [
                "funny"
            ],
            wholeProfile: true
        },
        bloom: BloomFilterID.contentRightPositive,
        profileBloom: BloomFilterID.profileRightPositive,
        text: "right positive whole profile"
    }, {
        req: {
            votes: [
                "boring"
            ],
            wholeProfile: true
        },
        bloom: BloomFilterID.contentRightNegative,
        profileBloom: BloomFilterID.profileRightNegative,
        text: "right negative whole profile"
    }, {
        req: {
            votes: [
                "funny"
            ],
            wholeProfile: false
        },
        bloom: BloomFilterID.contentRightPositive,
        profileBloom: BloomFilterID.profileRightPositive,
        text: "right positive"
    }, {
        req: {
            votes: [
                "boring"
            ],
            wholeProfile: false
        },
        bloom: BloomFilterID.contentRightNegative,
        profileBloom: BloomFilterID.profileRightNegative,
        text: "right negative"
    }].forEach((a) => {
        it(`Should generate bloom for ${a.text}`, (done) => {
            const contentID = `youtube.com-postSlop-${a.text}`;
            const profileID = `hi${a.text}`;
            postSlop({
                userID: submitUserOne,
                contentID,
                profileID,
                ...a.req
            })
                .then(async res => {
                    assert.strictEqual(res.status, 200);

                    const bloom = await queryForBloom(a.bloom);
                    assert.ok(checkBloom(bloom.data, contentID));

                    const profileBloom = await queryForBloom(a.profileBloom);
                    assert.equal(checkBloom(profileBloom.data, profileID), a.req.wholeProfile);

                    done();
                })
                .catch(err => done(err));
        });
    });
});
