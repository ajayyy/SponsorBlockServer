import { client } from "../utils/httpClient";
import assert from "assert";
import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import { Service } from "../../src/types/segments.model";
import { BrandingUUID, ThumbnailResult, TitleResult } from "../../src/types/branding.model";
import { partialDeepEquals } from "../utils/partialDeepEquals";

describe("getBranding", () => {
    const videoID1 = "videoID1";
    const videoID2Locked = "videoID2";
    const videoID2ShadowHide = "videoID3";
    const videoIDEmpty = "videoID4";
    const videoIDRandomTime = "videoID5";
    const videoIDUnverified = "videoID6";
    const videoIDvidDuration = "videoID7";

    const videoID1Hash = getHash(videoID1, 1).slice(0, 4);
    const videoID2LockedHash = getHash(videoID2Locked, 1).slice(0, 4);
    const videoID2ShadowHideHash = getHash(videoID2ShadowHide, 1).slice(0, 4);
    const videoIDEmptyHash = "aaaa";
    const videoIDRandomTimeHash = getHash(videoIDRandomTime, 1).slice(0, 4);
    const videoIDUnverifiedHash = getHash(videoIDUnverified, 1).slice(0, 4);
    const videoIDvidDurationHash = getHash(videoIDUnverified, 1).slice(0, 4);

    const endpoint = "/api/branding";
    const getBranding = (params: Record<string, any>) => client({
        method: "GET",
        url: endpoint,
        params
    });

    const getBrandingByHash = (hash: string, params: Record<string, any>) => client({
        method: "GET",
        url: `${endpoint}/${hash}`,
        params
    });

    before(async () => {
        const titleQuery = `INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const titleVotesQuery = `INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden", "verification", "downvotes", "removed") VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const thumbnailQuery = `INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const thumbnailTimestampsQuery = `INSERT INTO "thumbnailTimestamps" ("UUID", "timestamp") VALUES (?, ?)`;
        const thumbnailVotesQuery = `INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden", "downvotes", "removed") VALUES (?, ?, ?, ?, ?, ?)`;
        const segmentQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "hidden", "shadowHidden", "description", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        await Promise.all([
            db.prepare("run", titleQuery, [videoID1, "title1", 0, "userID1", Service.YouTube, videoID1Hash, 1, "UUID1"]),
            db.prepare("run", titleQuery, [videoID1, "title2", 0, "userID2", Service.YouTube, videoID1Hash, 1, "UUID2"]),
            db.prepare("run", titleQuery, [videoID1, "title3", 1, "userID3", Service.YouTube, videoID1Hash, 1, "UUID3"]),
            db.prepare("run", titleQuery, [videoID1, "title4removed", 0, "userID4", Service.YouTube, videoID1Hash, 1, "UUID4"]),
            db.prepare("run", thumbnailQuery, [videoID1, 0, "userID1", Service.YouTube, videoID1Hash, 1, "UUID1T"]),
            db.prepare("run", thumbnailQuery, [videoID1, 1, "userID2", Service.YouTube, videoID1Hash, 1, "UUID2T"]),
            db.prepare("run", thumbnailQuery, [videoID1, 0, "userID3", Service.YouTube, videoID1Hash, 1, "UUID3T"]),
            db.prepare("run", thumbnailQuery, [videoID1, 0, "userID4", Service.YouTube, videoID1Hash, 1, "UUID4T"]),
        ]);

        await Promise.all([
            db.prepare("run", titleVotesQuery, ["UUID1", 3, 0, 0, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID2", 3, 0, 0, 0, 1, 0]),
            db.prepare("run", titleVotesQuery, ["UUID3", 0, 0, 0, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID4", 5, 0, 0, 0, 0, 1]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID1T", 1]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID3T", 3]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID4T", 18]),
            db.prepare("run", thumbnailVotesQuery, ["UUID1T", 3, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID2T", 3, 0, 0, 1, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID3T", 1, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID4T", 5, 0, 0, 0, 1])
        ]);

        await Promise.all([
            db.prepare("run", titleQuery, [videoID2Locked, "title1", 0, "userID1", Service.YouTube, videoID2LockedHash, 1, "UUID11"]),
            db.prepare("run", titleQuery, [videoID2Locked, "title2", 0, "userID2", Service.YouTube, videoID2LockedHash, 1, "UUID21"]),
            db.prepare("run", titleQuery, [videoID2Locked, "title3", 1, "userID3", Service.YouTube, videoID2LockedHash, 1, "UUID31"]),
            db.prepare("run", thumbnailQuery, [videoID2Locked, 0, "userID1", Service.YouTube, videoID2LockedHash, 1, "UUID11T"]),
            db.prepare("run", thumbnailQuery, [videoID2Locked, 1, "userID2", Service.YouTube, videoID2LockedHash, 1, "UUID21T"]),
            db.prepare("run", thumbnailQuery, [videoID2Locked, 0, "userID3", Service.YouTube, videoID2LockedHash, 1, "UUID31T"])
        ]);

        await Promise.all([
            db.prepare("run", titleVotesQuery, ["UUID11", 3, 0, 0, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID21", 2, 0, 0, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID31", 1, 1, 0, 0, 0, 0]),

            db.prepare("run", thumbnailTimestampsQuery, ["UUID11T", 1]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID31T", 3]),
            db.prepare("run", thumbnailVotesQuery, ["UUID11T", 3, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID21T", 2, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID31T", 1, 1, 0, 0, 0]),
        ]);

        await Promise.all([
            db.prepare("run", titleQuery, [videoID2ShadowHide, "title1", 0, "userID1", Service.YouTube, videoID2ShadowHideHash, 1, "UUID12"]),
            db.prepare("run", titleQuery, [videoID2ShadowHide, "title2", 0, "userID2", Service.YouTube, videoID2ShadowHideHash, 1, "UUID22"]),
            db.prepare("run", titleQuery, [videoID2ShadowHide, "title3", 1, "userID3", Service.YouTube, videoID2ShadowHideHash, 1, "UUID32"]),
            db.prepare("run", thumbnailQuery, [videoID2ShadowHide, 0, "userID1", Service.YouTube, videoID2ShadowHideHash, 1, "UUID12T"]),
            db.prepare("run", thumbnailQuery, [videoID2ShadowHide, 1, "userID2", Service.YouTube, videoID2ShadowHideHash, 1, "UUID22T"]),
            db.prepare("run", thumbnailQuery, [videoID2ShadowHide, 0, "userID3", Service.YouTube, videoID2ShadowHideHash, 1, "UUID32T"])
        ]);

        await Promise.all([
            db.prepare("run", titleVotesQuery, ["UUID12", 3, 0, 0, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID22", 2, 0, 0, 0, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID32", 1, 0, 1, 0, 0, 0]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID12T", 1]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID32T", 3]),
            db.prepare("run", thumbnailVotesQuery, ["UUID12T", 3, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID22T", 2, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID32T", 1, 0, 1, 0, 0])
        ]);

        await db.prepare("run", segmentQuery, [videoIDRandomTime, 1, 11, 1, 0, "uuidbranding1", "testman", 0, 50, "sponsor", "skip", "YouTube", 100, 0, 0, "", videoIDRandomTimeHash]);
        await db.prepare("run", segmentQuery, [videoIDRandomTime, 20, 33, 2, 0, "uuidbranding2", "testman", 0, 50, "intro", "skip", "YouTube", 100, 0, 0, "", videoIDRandomTimeHash]);

        await Promise.all([
            db.prepare("run", titleQuery, [videoIDUnverified, "title1", 0, "userID1", Service.YouTube, videoIDUnverifiedHash, 1, "UUID-uv-1"]),
            db.prepare("run", titleQuery, [videoIDUnverified, "title2", 0, "userID2", Service.YouTube, videoIDUnverifiedHash, 1, "UUID-uv-2"]),
            db.prepare("run", titleQuery, [videoIDUnverified, "title3", 1, "userID3", Service.YouTube, videoIDUnverifiedHash, 1, "UUID-uv-3"]),
            db.prepare("run", thumbnailQuery, [videoIDUnverified, 0, "userID1", Service.YouTube, videoIDUnverifiedHash, 1, "UUID-uv-1T"]),
            db.prepare("run", thumbnailQuery, [videoIDUnverified, 1, "userID2", Service.YouTube, videoIDUnverifiedHash, 1, "UUID-uv-2T"]),
            db.prepare("run", thumbnailQuery, [videoIDUnverified, 0, "userID3", Service.YouTube, videoIDUnverifiedHash, 1, "UUID-uv-3T"]),
        ]);

        await Promise.all([
            db.prepare("run", titleVotesQuery, ["UUID-uv-1", 3, 0, 0, -1, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID-uv-2", 2, 0, 0, -1, 0, 0]),
            db.prepare("run", titleVotesQuery, ["UUID-uv-3", 0, 0, 0, -1, 0, 0]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID-uv-1T", 1]),
            db.prepare("run", thumbnailTimestampsQuery, ["UUID-uv-3T", 3]),
            db.prepare("run", thumbnailVotesQuery, ["UUID-uv-1T", 3, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID-uv-2T", 2, 0, 0, 0, 0]),
            db.prepare("run", thumbnailVotesQuery, ["UUID-uv-3T", 1, 0, 0, 0, 0])
        ]);

        // Video duration test segments
        await Promise.all([
            db.prepare("run", segmentQuery, [videoIDvidDuration, 0, 1, 0, 0, "uuidvd1", "testman", 10, 0, "sponsor", "skip", "YouTube", 0, 0, 0, "", videoIDvidDurationHash]),  // visible, no vid duration
            db.prepare("run", segmentQuery, [videoIDvidDuration, 0, 2, -2, 0, "uuidvd2", "testman", 11, 0, "sponsor", "skip", "YouTube", 10, 0, 0, "", videoIDvidDurationHash]),  // downvoted
            db.prepare("run", segmentQuery, [videoIDvidDuration, 0, 3, 0, 0, "uuidvd3", "testman", 12, 0, "sponsor", "skip", "YouTube", 10.1, 1, 0, "", videoIDvidDurationHash]),  // hidden
            db.prepare("run", segmentQuery, [videoIDvidDuration, 0, 4, 0, 0, "uuidvd4", "testman", 13, 0, "sponsor", "skip", "YouTube", 20.1, 0, 1, "", videoIDvidDurationHash]),  // shadowhidden
            db.prepare("run", segmentQuery, [videoIDvidDuration, 0, 5, 0, 0, "uuidvd5", "testman", 14, 0, "sponsor", "skip", "YouTube", 21.3, 0, 0, "", videoIDvidDurationHash]),  // oldest visible w/ duration, should be picked
            db.prepare("run", segmentQuery, [videoIDvidDuration, 0, 6, 0, 0, "uuidvd6", "testman", 15, 0, "sponsor", "skip", "YouTube", 21.37, 0, 0, "", videoIDvidDurationHash]),  // not the oldest visible
            db.prepare("run", segmentQuery, [videoIDvidDuration, 0, 7, -2, 0, "uuidvd7", "testman", 16, 0, "sponsor", "skip", "YouTube", 21.38, 0, 0, "", videoIDvidDurationHash]),  // downvoted, not the oldest
        ]);
    });

    it("should get top titles and thumbnails", async () => {
        await checkVideo(videoID1, videoID1Hash, false, {
            titles: [{
                title: "title1",
                original: false,
                votes: 3,
                locked: false,
                UUID: "UUID1" as BrandingUUID
            }, {
                title: "title2",
                original: false,
                votes: 2,
                locked: false,
                UUID: "UUID2" as BrandingUUID
            }, {
                title: "title3",
                original: true,
                votes: 0,
                locked: false,
                UUID: "UUID3" as BrandingUUID
            }],
            thumbnails: [{
                timestamp: 1,
                original: false,
                votes: 3,
                locked: false,
                UUID: "UUID1T" as BrandingUUID
            }, {
                original: true,
                votes: 2,
                locked: false,
                UUID: "UUID2T" as BrandingUUID
            }, {
                timestamp: 3,
                original: false,
                votes: 1,
                locked: false,
                UUID: "UUID3T" as BrandingUUID
            }]
        });
    });

    it("should get top titles and thumbnails prioritizing locks", async () => {
        await checkVideo(videoID2Locked, videoID2LockedHash, false, {
            titles: [{
                title: "title3",
                original: true,
                votes: 1,
                locked: true,
                UUID: "UUID31" as BrandingUUID
            }, {
                title: "title1",
                original: false,
                votes: 3,
                locked: false,
                UUID: "UUID11" as BrandingUUID
            }, {
                title: "title2",
                original: false,
                votes: 2,
                locked: false,
                UUID: "UUID21" as BrandingUUID
            }],
            thumbnails: [{
                timestamp: 3,
                original: false,
                votes: 1,
                locked: true,
                UUID: "UUID31T" as BrandingUUID
            }, {
                timestamp: 1,
                original: false,
                votes: 3,
                locked: false,
                UUID: "UUID11T" as BrandingUUID
            }, {
                original: true,
                votes: 2,
                locked: false,
                UUID: "UUID21T" as BrandingUUID
            }]
        });
    });

    it("should get top titles and hide shadow hidden", async () => {
        await checkVideo(videoID2ShadowHide, videoID2ShadowHideHash, false, {
            titles: [{
                title: "title1",
                original: false,
                votes: 3,
                locked: false,
                UUID: "UUID12" as BrandingUUID
            }, {
                title: "title2",
                original: false,
                votes: 2,
                locked: false,
                UUID: "UUID22" as BrandingUUID
            }],
            thumbnails: [{
                timestamp: 1,
                original: false,
                votes: 3,
                locked: false,
                UUID: "UUID12T" as BrandingUUID
            }, {
                original: true,
                votes: 2,
                locked: false,
                UUID: "UUID22T" as BrandingUUID
            }]
        });
    });

    it("should get 404 when nothing", async () => {
        const result1 = await getBranding({ videoID: videoIDEmpty, fetchAll: true });
        const result2 = await getBrandingByHash(videoIDEmptyHash, { fetchAll: true });

        assert.strictEqual(result1.status, 404);
        assert.strictEqual(result2.status, 404);
    });

    it("should get correct random time", async () => {
        const videoDuration = 100;

        const result1 = await getBranding({ videoID: videoIDRandomTime, fetchAll: true });
        const result2 = await getBrandingByHash(videoIDRandomTimeHash, { fetchAll: true });

        const randomTime = result1.data.randomTime;
        assert.strictEqual(randomTime, result2.data[videoIDRandomTime].randomTime);
        assert.ok(randomTime > 0 && randomTime < 1);

        const timeAbsolute = randomTime * videoDuration;
        assert.ok(timeAbsolute < 1 || (timeAbsolute > 11 && timeAbsolute < 20) || timeAbsolute > 33);

        assert.strictEqual(result1.data.videoDuration, 100);
    });

    it("should get top titles and thumbnails that are unverified", async () => {
        await checkVideo(videoIDUnverified, videoIDUnverifiedHash, true, {
            titles: [{
                title: "title1",
                original: false,
                votes: 2,
                locked: false,
                UUID: "UUID-uv-1" as BrandingUUID
            }, {
                title: "title2",
                original: false,
                votes: 1,
                locked: false,
                UUID: "UUID-uv-2" as BrandingUUID
            }, {
                title: "title3",
                original: true,
                votes: -1,
                locked: false,
                UUID: "UUID-uv-3" as BrandingUUID
            }],
            thumbnails: [{
                timestamp: 1,
                original: false,
                votes: 3,
                locked: false,
                UUID: "UUID-uv-1T" as BrandingUUID
            }, {
                original: true,
                votes: 2,
                locked: false,
                UUID: "UUID-uv-2T" as BrandingUUID
            }, {
                timestamp: 3,
                original: false,
                votes: 1,
                locked: false,
                UUID: "UUID-uv-3T" as BrandingUUID
            }]
        });
    });

    it("should get the correct video duration", async () => {
        const correctDuration = 21.3;

        const result1 = await getBranding({ videoID: videoIDvidDuration, fetchAll: true });
        const result2 = await getBrandingByHash(videoIDvidDurationHash, { fetchAll: true });

        assert.strictEqual(result1.data.videoDuration, correctDuration);
        assert.strictEqual(result2.data[videoIDvidDuration].videoDuration, correctDuration);
    });

    async function checkVideo(videoID: string, videoIDHash: string, fetchAll: boolean, expected: {
        titles: TitleResult[],
        thumbnails: ThumbnailResult[]
    }) {
        const result1 = await getBranding({ videoID, fetchAll });
        const result2 = await getBrandingByHash(videoIDHash, { fetchAll });

        assert.strictEqual(result1.status, 200);
        assert.strictEqual(result2.status, 200);
        assert.deepEqual(result1.data, result2.data[videoID]);
        assert.ok(partialDeepEquals(result1.data, expected));
    }
});
