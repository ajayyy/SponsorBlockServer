import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import { client } from "../utils/httpClient";
import assert from "assert";
import { Service } from "../../src/types/segments.model";

describe("postBranding", () => {

    const vipUser = `VIPPostBrandingUser${".".repeat(16)}`;
    const userID1 = `PostBrandingUser1${".".repeat(16)}`;
    const userID2 = `PostBrandingUser2${".".repeat(16)}`;
    const userID3 = `PostBrandingUser3${".".repeat(16)}`;
    const userID4 = `PostBrandingUser4${".".repeat(16)}`;
    const userID5 = `PostBrandingUser4${".".repeat(16)}`;

    const endpoint = "/api/branding";
    const postBranding = (data: Record<string, any>) => client({
        method: "POST",
        url: endpoint,
        data
    });

    const queryTitleByVideo = (videoID: string) => db.prepare("get", `SELECT * FROM "titles" WHERE "videoID" = ? ORDER BY "timeSubmitted" DESC`, [videoID]);
    const queryThumbnailByVideo = (videoID: string) => db.prepare("get", `SELECT * FROM "thumbnails" WHERE "videoID" = ? ORDER BY "timeSubmitted" DESC`, [videoID]);
    const queryThumbnailTimestampsByUUID = (UUID: string) => db.prepare("get", `SELECT * FROM "thumbnailTimestamps" WHERE "UUID" = ?`, [UUID]);
    const queryTitleVotesByUUID = (UUID: string) => db.prepare("get", `SELECT * FROM "titleVotes" WHERE "UUID" = ?`, [UUID]);
    const queryThumbnailVotesByUUID = (UUID: string) => db.prepare("get", `SELECT * FROM "thumbnailVotes" WHERE "UUID" = ?`, [UUID]);

    before(() => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        db.prepare("run", insertVipUserQuery, [getHash(vipUser)]);
    });

    it("Submit only title", async () => {
        const videoID = "postBrand1";
        const title = {
            title: "Some title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Submit only original title", async () => {
        const videoID = "postBrand2";
        const title = {
            title: "Some title",
            original: true
        };

        const res = await postBranding({
            title,
            userID: userID2,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Submit only original thumbnail", async () => {
        const videoID = "postBrand3";
        const thumbnail = {
            original: true
        };

        const res = await postBranding({
            thumbnail,
            userID: userID3,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Submit only custom thumbnail", async () => {
        const videoID = "postBrand4";
        const thumbnail = {
            timestamp: 12.42,
            original: false
        };

        const res = await postBranding({
            thumbnail,
            userID: userID4,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbThumbnailTimestamps = await queryThumbnailTimestampsByUUID(dbThumbnail.UUID);
        const dbVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbThumbnailTimestamps.timestamp, thumbnail.timestamp);
        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Submit title and thumbnail", async () => {
        const videoID = "postBrand5";
        const title = {
            title: "Some title",
            original: false
        };
        const thumbnail = {
            timestamp: 12.42,
            original: false
        };

        const res = await postBranding({
            title,
            thumbnail,
            userID: userID5,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbTitleVotes = await queryTitleVotesByUUID(dbTitle.UUID);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbThumbnailTimestamps = await queryThumbnailTimestampsByUUID(dbThumbnail.UUID);
        const dbThumbnailVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbTitleVotes.votes, 0);
        assert.strictEqual(dbTitleVotes.locked, 0);
        assert.strictEqual(dbTitleVotes.shadowHidden, 0);

        assert.strictEqual(dbThumbnailTimestamps.timestamp, thumbnail.timestamp);
        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbThumbnailVotes.votes, 0);
        assert.strictEqual(dbThumbnailVotes.locked, 0);
        assert.strictEqual(dbThumbnailVotes.shadowHidden, 0);
    });

    it("Submit title and thumbnail as VIP", async () => {
        const videoID = "postBrand6";
        const title = {
            title: "Some title",
            original: false
        };
        const thumbnail = {
            timestamp: 12.42,
            original: false
        };

        const res = await postBranding({
            title,
            thumbnail,
            userID: vipUser,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbTitleVotes = await queryTitleVotesByUUID(dbTitle.UUID);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbThumbnailTimestamps = await queryThumbnailTimestampsByUUID(dbThumbnail.UUID);
        const dbThumbnailVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbTitleVotes.votes, 0);
        assert.strictEqual(dbTitleVotes.locked, 1);
        assert.strictEqual(dbTitleVotes.shadowHidden, 0);

        assert.strictEqual(dbThumbnailTimestamps.timestamp, thumbnail.timestamp);
        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbThumbnailVotes.votes, 0);
        assert.strictEqual(dbThumbnailVotes.locked, 1);
        assert.strictEqual(dbThumbnailVotes.shadowHidden, 0);
    });

    it("Vote the same title again", async () => {
        const videoID = "postBrand1";
        const title = {
            title: "Some title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Vote for a different title", async () => {
        const videoID = "postBrand1";
        const title = {
            title: "Some other title",
            original: false
        };

        const oldDbTitle = await queryTitleByVideo(videoID);

        const res = await postBranding({
            title,
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);
        const oldDBVotes = await queryTitleVotesByUUID(oldDbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);

        assert.strictEqual(oldDBVotes.votes, -1);
        assert.strictEqual(oldDBVotes.locked, 0);
        assert.strictEqual(oldDBVotes.shadowHidden, 0);
    });

    it("Vote for the same thumbnail again", async () => {
        const videoID = "postBrand4";
        const thumbnail = {
            timestamp: 12.42,
            original: false
        };

        const res = await postBranding({
            thumbnail,
            userID: userID4,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbThumbnailTimestamps = await queryThumbnailTimestampsByUUID(dbThumbnail.UUID);
        const dbVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbThumbnailTimestamps.timestamp, thumbnail.timestamp);
        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Vote for the same thumbnail again original", async () => {
        const videoID = "postBrand3";
        const thumbnail = {
            original: true
        };

        const res = await postBranding({
            thumbnail,
            userID: userID3,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Vote for a different thumbnail", async () => {
        const videoID = "postBrand4";
        const thumbnail = {
            timestamp: 15.34,
            original: false
        };

        const oldDbThumbnail = await queryThumbnailByVideo(videoID);

        const res = await postBranding({
            thumbnail,
            userID: userID4,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbThumbnailTimestamps = await queryThumbnailTimestampsByUUID(dbThumbnail.UUID);
        const dbVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);
        const oldDBVotes = await queryThumbnailVotesByUUID(oldDbThumbnail.UUID);

        assert.strictEqual(dbThumbnailTimestamps.timestamp, thumbnail.timestamp);
        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);

        assert.strictEqual(oldDBVotes.votes, -1);
        assert.strictEqual(oldDBVotes.locked, 0);
        assert.strictEqual(oldDBVotes.shadowHidden, 0);
    });
});