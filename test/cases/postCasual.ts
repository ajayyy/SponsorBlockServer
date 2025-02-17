import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
import assert from "assert";
import { Service } from "../../src/types/segments.model";

describe("postCasual", () => {

    const userID1 = `PostCasualUser1${".".repeat(16)}`;
    const userID2 = `PostCasualUser2${".".repeat(16)}`;
    const userID3 = `PostCasualUser3${".".repeat(16)}`;

    const endpoint = "/api/casual";
    const postCasual = (data: Record<string, any>) => client({
        method: "POST",
        url: endpoint,
        data
    });

    const queryCasualVotesByVideo = (videoID: string, all = false, titleID = 0) => db.prepare(all ? "all" : "get", `SELECT * FROM "casualVotes" WHERE "videoID" = ? AND "titleID" = ? ORDER BY "timeSubmitted" ASC`, [videoID, titleID]);

    it("submit casual vote", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            categories: ["clever"],
            userID: userID1,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 1);
    });

    it("submit same casual vote again", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            categories: ["clever"],
            userID: userID1,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 1);
    });

    it("submit casual upvote", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            categories: ["clever"],
            userID: userID2,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 2);
    });

    it("submit casual downvote from same user", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            downvote: true,
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID, true);

        assert.strictEqual(dbVotes[0].category, "clever");
        assert.strictEqual(dbVotes[0].upvotes, 1);

        assert.strictEqual(dbVotes[1].category, "downvote");
        assert.strictEqual(dbVotes[1].upvotes, 1);
    });

    it("submit casual downvote from different user", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            downvote: true,
            userID: userID3,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID, true);

        assert.strictEqual(dbVotes[0].category, "clever");
        assert.strictEqual(dbVotes[0].upvotes, 1);

        assert.strictEqual(dbVotes[1].category, "downvote");
        assert.strictEqual(dbVotes[1].upvotes, 2);
    });

    it("submit casual upvote from same user", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            categories: ["clever"],
            downvote: false,
            userID: userID3,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID, true);

        assert.strictEqual(dbVotes[0].category, "clever");
        assert.strictEqual(dbVotes[0].upvotes, 2);

        assert.strictEqual(dbVotes[1].category, "downvote");
        assert.strictEqual(dbVotes[1].upvotes, 1);
    });

    it("submit multiple casual votes", async () => {
        const videoID = "postCasual2";

        const res = await postCasual({
            categories: ["clever", "other"],
            userID: userID1,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID, true);

        assert.strictEqual(dbVotes[0].category, "clever");
        assert.strictEqual(dbVotes[0].upvotes, 1);

        assert.strictEqual(dbVotes[1].category, "other");
        assert.strictEqual(dbVotes[1].upvotes, 1);
    });

    it("downvote on video with previous votes with multiple categories", async () => {
        const videoID = "postCasual2";

        const res = await postCasual({
            downvote: true,
            userID: userID1,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID, true);

        assert.strictEqual(dbVotes[0].category, "clever");
        assert.strictEqual(dbVotes[0].upvotes, 0);

        assert.strictEqual(dbVotes[1].category, "other");
        assert.strictEqual(dbVotes[1].upvotes, 0);

        assert.strictEqual(dbVotes[2].category, "downvote");
        assert.strictEqual(dbVotes[2].upvotes, 1);
    });

    it("upvote on video with previous downvotes with multiple categories", async () => {
        const videoID = "postCasual2";

        const res = await postCasual({
            categories: ["clever", "other"],
            userID: userID1,
            service: Service.YouTube,
            title: "title",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID, true);

        assert.strictEqual(dbVotes[0].category, "clever");
        assert.strictEqual(dbVotes[0].upvotes, 1);

        assert.strictEqual(dbVotes[1].category, "other");
        assert.strictEqual(dbVotes[1].upvotes, 1);
    });

    it("downvote on video with no existing votes", async () => {
        const videoID = "postCasual3";

        const res = await postCasual({
            userID: userID1,
            service: Service.YouTube,
            title: "title",
            videoID,
            downvote: true
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "downvote");
        assert.strictEqual(dbVotes.upvotes, 1);
    });

    it("submit multiple casual votes for different title", async () => {
        const videoID = "postCasual2";

        const res = await postCasual({
            categories: ["clever", "funny"],
            userID: userID2,
            service: Service.YouTube,
            title: "title 2",
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID, true, 1);

        assert.strictEqual(dbVotes[0].category, "clever");
        assert.strictEqual(dbVotes[0].upvotes, 1);

        assert.strictEqual(dbVotes[1].category, "funny");
        assert.strictEqual(dbVotes[1].upvotes, 1);

        const dbVotesOriginal = await queryCasualVotesByVideo(videoID, true, 0);

        assert.strictEqual(dbVotesOriginal[0].category, "clever");
        assert.strictEqual(dbVotesOriginal[0].upvotes, 1);

        assert.strictEqual(dbVotesOriginal[1].category, "other");
        assert.strictEqual(dbVotesOriginal[1].upvotes, 1);
    });

});
