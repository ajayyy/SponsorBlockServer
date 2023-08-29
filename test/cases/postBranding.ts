import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import { client } from "../utils/httpClient";
import assert from "assert";
import { Service } from "../../src/types/segments.model";

describe("postBranding", () => {

    const vipUser = `VIPPostBrandingUser${".".repeat(16)}`;
    const vipUser2 = `VIPPostBrandingUser2${".".repeat(16)}`;
    const userID1 = `PostBrandingUser1${".".repeat(16)}`;
    const userID2 = `PostBrandingUser2${".".repeat(16)}`;
    const userID3 = `PostBrandingUser3${".".repeat(16)}`;
    const userID4 = `PostBrandingUser4${".".repeat(16)}`;
    const userID5 = `PostBrandingUser5${".".repeat(16)}`;
    const userID6 = `PostBrandingUser6${".".repeat(16)}`;
    const userID7 = `PostBrandingUser7${".".repeat(16)}`;
    const userID8 = `PostBrandingUser8${".".repeat(16)}`;
    const bannedUser = `BannedPostBrandingUser${".".repeat(16)}`;


    const endpoint = "/api/branding";
    const postBranding = (data: Record<string, any>) => client({
        method: "POST",
        url: endpoint,
        data
    });

    const queryTitleByVideo = (videoID: string, all = false) => db.prepare(all ? "all" : "get", `SELECT * FROM "titles" WHERE "videoID" = ? ORDER BY "timeSubmitted" DESC`, [videoID]);
    const queryThumbnailByVideo = (videoID: string, all = false) => db.prepare(all ? "all" : "get", `SELECT * FROM "thumbnails" WHERE "videoID" = ? ORDER BY "timeSubmitted" DESC`, [videoID]);
    const queryThumbnailTimestampsByUUID = (UUID: string, all = false) => db.prepare(all ? "all" : "get", `SELECT * FROM "thumbnailTimestamps" WHERE "UUID" = ?`, [UUID]);
    const queryTitleVotesByUUID = (UUID: string, all = false) => db.prepare(all ? "all" : "get", `SELECT * FROM "titleVotes" WHERE "UUID" = ?`, [UUID]);
    const queryThumbnailVotesByUUID = (UUID: string, all = false) => db.prepare(all ? "all" : "get", `SELECT * FROM "thumbnailVotes" WHERE "UUID" = ?`, [UUID]);

    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash(vipUser)]);
        await db.prepare("run", insertVipUserQuery, [getHash(vipUser2)]);

        const insertBannedUserQuery = 'INSERT INTO "shadowBannedUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertBannedUserQuery, [getHash(bannedUser)]);

        const insertTitleQuery = 'INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertTitleQuery, ["postBrandLocked1", "Some title", 0, getHash(userID1), Service.YouTube, getHash("postBrandLocked1"), Date.now(), "postBrandLocked1"]);
        await db.prepare("run", insertTitleQuery, ["postBrandLocked2", "Some title", 1, getHash(userID2), Service.YouTube, getHash("postBrandLocked2"), Date.now(), "postBrandLocked2"]);
        const insertTitleVotesQuery = 'INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden", "verification") VALUES (?, ?, ?, ?, ?);';
        await db.prepare("run", insertTitleVotesQuery, ["postBrandLocked1", 0, 1, 0, 0]);
        await db.prepare("run", insertTitleVotesQuery, ["postBrandLocked2", 0, 1, 0, 0]);

        const insertThumbnailQuery = 'INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertThumbnailQuery, ["postBrandLocked1", 0, getHash(userID3), Service.YouTube, getHash("postBrandLocked1"), Date.now(), "postBrandLocked1"]);
        await db.prepare("run", insertThumbnailQuery, ["postBrandLocked2", 1, getHash(userID4), Service.YouTube, getHash("postBrandLocked2"), Date.now(), "postBrandLocked2"]);
        const insertThumbnailVotesQuery = 'INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, ?, ?, ?);';
        await db.prepare("run", insertThumbnailVotesQuery, ["postBrandLocked1", 0, 1, 0]);
        await db.prepare("run", insertThumbnailVotesQuery, ["postBrandLocked2", 0, 1, 0]);

        // Verified through title submissions
        await db.prepare("run", insertTitleQuery, ["postBrandVerified1", "Some title", 0, getHash(userID7), Service.YouTube, getHash("postBrandVerified1"), Date.now(), "postBrandVerified1"]);
        await db.prepare("run", insertTitleQuery, ["postBrandVerified2", "Some title", 1, getHash(userID7), Service.YouTube, getHash("postBrandVerified2"), Date.now(), "postBrandVerified2"]);
        await db.prepare("run", insertTitleVotesQuery, ["postBrandVerified1", 5, 0, 0, -1]);
        await db.prepare("run", insertTitleVotesQuery, ["postBrandVerified2", -1, 0, 0, -1]);

        // Verified through SponsorBlock submissions
        const insertSegment = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "hidden", "shadowHidden", "description") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSegment, ["postBrandVerified3", 1, 11, 1, 0, "postBrandVerified3", getHash(userID8), 0, 50, "sponsor", "skip", "YouTube", 100, 0, 0, ""]);
        await db.prepare("run", insertSegment, ["postBrandVerified3", 11, 21, 1, 0, "postBrandVerified32", getHash(userID8), 0, 50, "sponsor", "skip", "YouTube", 100, 0, 0, ""]);
        await db.prepare("run", insertSegment, ["postBrandVerified3", 21, 31, 1, 0, "postBrandVerified33", getHash(userID8), 0, 50, "sponsor", "skip", "YouTube", 100, 0, 0, ""]);

        // Testing details for banned user handling
        await db.prepare("run", insertTitleQuery, ["postBrandBannedCustomVote",   "Some title", 0, getHash(userID1), Service.YouTube, getHash("postBrandBannedCustomVote"), Date.now(), "postBrandBannedCustomVote"]);
        await db.prepare("run", insertTitleQuery, ["postBrandBannedOriginalVote", "Some title", 1, getHash(userID1), Service.YouTube, getHash("postBrandBannedOriginalVote"), Date.now(), "postBrandBannedOriginalVote"]);
        await db.prepare("run", insertTitleVotesQuery, ["postBrandBannedCustomVote",   0, 0, 0, 0]);
        await db.prepare("run", insertTitleVotesQuery, ["postBrandBannedOriginalVote", 0, 0, 0, 0]);
        await db.prepare("run", insertThumbnailQuery, ["postBrandBannedCustomVote",   0, getHash(userID1), Service.YouTube, getHash("postBrandBannedCustomVote"), Date.now(), "postBrandBannedCustomVote"]);
        await db.prepare("run", insertThumbnailQuery, ["postBrandBannedOriginalVote", 1, getHash(userID1), Service.YouTube, getHash("postBrandBannedOriginalVote"), Date.now(), "postBrandBannedOriginalVote"]);
        await db.prepare("run", insertThumbnailVotesQuery, ["postBrandBannedCustomVote", 0, 0, 0]);
        await db.prepare("run", insertThumbnailVotesQuery, ["postBrandBannedOriginalVote", 0, 0, 0]);
        const insertThumbnailTimestampQuery = 'INSERT INTO "thumbnailTimestamps" ("UUID", "timestamp") VALUES (?, ?)';
        await db.prepare("run", insertThumbnailTimestampQuery, ["postBrandBannedCustomVote", 12.34]);
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

    it("Submit another title and thumbnail as VIP unlocks others", async () => {
        const videoID = "postBrand6";
        const title = {
            title: "Some other title",
            original: false
        };
        const thumbnail = {
            timestamp: 15.42,
            original: false
        };

        const res = await postBranding({
            title,
            thumbnail,
            userID: vipUser2,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitles = await queryTitleByVideo(videoID, true);
        const dbTitleVotes = await queryTitleVotesByUUID(dbTitles[0].UUID);
        const dbTitleVotesOld = await queryTitleVotesByUUID(dbTitles[1].UUID);
        const dbThumbnails = await queryThumbnailByVideo(videoID, true);
        const dbThumbnailTimestamps = await queryThumbnailTimestampsByUUID(dbThumbnails[0].UUID);
        const dbThumbnailVotes = await queryThumbnailVotesByUUID(dbThumbnails[0].UUID);
        const dbThumbnailVotesOld = await queryThumbnailVotesByUUID(dbThumbnails[1].UUID);

        assert.strictEqual(dbTitles[0].title, title.title);
        assert.strictEqual(dbTitles[0].original, title.original ? 1 : 0);

        assert.strictEqual(dbTitleVotes.votes, 0);
        assert.strictEqual(dbTitleVotes.locked, 1);
        assert.strictEqual(dbTitleVotes.shadowHidden, 0);
        assert.strictEqual(dbTitleVotesOld.locked, 0);

        assert.strictEqual(dbThumbnailTimestamps.timestamp, thumbnail.timestamp);
        assert.strictEqual(dbThumbnails[0].original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbThumbnailVotes.votes, 0);
        assert.strictEqual(dbThumbnailVotes.locked, 1);
        assert.strictEqual(dbThumbnailVotes.shadowHidden, 0);
        assert.strictEqual(dbThumbnailVotesOld.locked, 0);

        const otherSegmentTitleVotes1 = await queryTitleVotesByUUID("postBrandLocked1");
        const otherSegmentTitleVotes2 = await queryTitleVotesByUUID("postBrandLocked2");
        const otherSegmentThumbnailVotes1 = await queryThumbnailVotesByUUID("postBrandLocked1");
        const otherSegmentThumbnailVotes2 = await queryThumbnailVotesByUUID("postBrandLocked2");

        // They should remain locked
        assert.strictEqual(otherSegmentTitleVotes1.locked, 1);
        assert.strictEqual(otherSegmentTitleVotes2.locked, 1);
        assert.strictEqual(otherSegmentThumbnailVotes1.locked, 1);
        assert.strictEqual(otherSegmentThumbnailVotes2.locked, 1);
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

    it("Vote for an existing title from another user", async () => {
        const videoID = "postBrand1";
        const title = {
            title: "Some other title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: userID4,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 1);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Vote for the same thumbnail from a different user", async () => {
        const videoID = "postBrand4";
        const thumbnail = {
            timestamp: 15.34,
            original: false
        };

        const res = await postBranding({
            thumbnail,
            userID: userID1,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbThumbnailTimestamps = await queryThumbnailTimestampsByUUID(dbThumbnail.UUID);
        const dbVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbThumbnailTimestamps.timestamp, thumbnail.timestamp);
        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 1);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 0);
    });

    it("Submit from unverified user", async () => {
        const videoID = "postBrandUnverified";
        const title = {
            title: "Some title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: userID6,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.verification, -1);
    });

    it("Submit from verified user from title submissions", async () => {
        const videoID = "postBrandVerified";
        const title = {
            title: "Some title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: userID7,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.verification, 0);

        // Other segments now verified too
        const dbVotes2 = await queryTitleVotesByUUID("postBrandVerified1");
        assert.strictEqual(dbVotes2.verification, 0);

        const dbVotes3 = await queryTitleVotesByUUID("postBrandVerified2");
        assert.strictEqual(dbVotes3.verification, 0);
    });

    it("Submit from verified user from SponsorBlock submissions", async () => {
        const videoID = "postBrandVerified2-2";
        const title = {
            title: "Some title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: userID8,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        const dbVotes = await queryTitleVotesByUUID(dbTitle.UUID);

        assert.strictEqual(dbTitle.title, title.title);
        assert.strictEqual(dbTitle.original, title.original ? 1 : 0);

        assert.strictEqual(dbVotes.verification, 0);
    });

    it("Banned users should not be able to vote (custom title)", async () => {
        const videoID = "postBrandBannedCustomVote";
        const title = {
            title: "Some title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: bannedUser,
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

    it("Banned users should not be able to vote (original title)", async () => {
        const videoID = "postBrandBannedOriginalVote";
        const title = {
            title: "Some title",
            original: true
        };

        const res = await postBranding({
            title,
            userID: bannedUser,
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

    it("Banned users should not be able to vote (custom thumbnail)", async () => {
        const videoID = "postBrandBannedCustomVote";
        const thumbnail = {
            original: false,
            timestamp: 12.34
        };

        const res = await postBranding({
            thumbnail,
            userID: bannedUser,
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

    it("Banned users should not be able to vote (original thumbnail)", async () => {
        const videoID = "postBrandBannedOriginalVote";
        const thumbnail = {
            original: true
        };

        const res = await postBranding({
            thumbnail,
            userID: bannedUser,
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

    it("Banned users' custom submissions should be hidden (title)", async () => {
        const videoID = "postBrandBannedCustom";
        const title = {
            title: "Some title",
            original: false
        };

        const res = await postBranding({
            title,
            userID: bannedUser,
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
        assert.strictEqual(dbVotes.shadowHidden, 1);
    });

    it("Banned users' custom submissions should be hidden (thumbnail)", async () => {
        const videoID = "postBrandBannedCustom";
        const thumbnail = {
            original: false,
            timestamp: 12.34
        };

        const res = await postBranding({
            thumbnail,
            userID: bannedUser,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        const dbVotes = await queryThumbnailVotesByUUID(dbThumbnail.UUID);

        assert.strictEqual(dbThumbnail.original, thumbnail.original ? 1 : 0);

        assert.strictEqual(dbVotes.votes, 0);
        assert.strictEqual(dbVotes.locked, 0);
        assert.strictEqual(dbVotes.shadowHidden, 1);
    });

    it("Banned users' original submissions should be ignored (title)", async () => {
        const videoID = "postBrandBannedOriginal";
        const title = {
            title: "Some title",
            original: true
        };

        const res = await postBranding({
            title,
            userID: bannedUser,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbTitle = await queryTitleByVideo(videoID);
        assert.strictEqual(dbTitle, undefined);
    });

    it("Banned users' original submissions should be ignored (thumbnail)", async () => {
        const videoID = "postBrandBannedOriginal";
        const thumbnail = {
            original: true
        };

        const res = await postBranding({
            thumbnail,
            userID: bannedUser,
            service: Service.YouTube,
            videoID
        });

        assert.strictEqual(res.status, 200);
        const dbThumbnail = await queryThumbnailByVideo(videoID);
        assert.strictEqual(dbThumbnail, undefined);
    });
});
