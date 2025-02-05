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

    const queryCasualVotesByVideo = (videoID: string, all = false) => db.prepare(all ? "all" : "get", `SELECT * FROM "casualVotes" WHERE "videoID" = ? ORDER BY "timeSubmitted" DESC`, [videoID]);

    it("submit casual vote", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            category: "clever",
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 1);
        assert.strictEqual(dbVotes.downvotes, 0);
    });

    it("submit same casual vote again", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            category: "clever",
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 1);
        assert.strictEqual(dbVotes.downvotes, 0);
    });

    it("submit casual upvote", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            category: "clever",
            userID: userID2,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 2);
        assert.strictEqual(dbVotes.downvotes, 0);
    });

    it("submit casual downvote from same user", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            category: "clever",
            downvote: true,
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 1);
        assert.strictEqual(dbVotes.downvotes, 1);
    });

    it("submit casual downvote from different user", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            category: "clever",
            downvote: true,
            userID: userID3,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 1);
        assert.strictEqual(dbVotes.downvotes, 2);
    });

    it("submit casual upvote from same user", async () => {
        const videoID = "postCasual1";

        const res = await postCasual({
            category: "clever",
            downvote: false,
            userID: userID3,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbVotes = await queryCasualVotesByVideo(videoID);

        assert.strictEqual(dbVotes.category, "clever");
        assert.strictEqual(dbVotes.upvotes, 2);
        assert.strictEqual(dbVotes.downvotes, 1);
    });

});
