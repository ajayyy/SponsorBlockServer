import assert from "assert";
import { convertSingleToDBFormat } from "./postSkipSegments";
import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { client } from "../utils/httpClient";

const endpoint = "/api/skipSegments";

const queryUseragent = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "userAgent" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);

describe("postSkipSegments - userAgent", () => {
    const userIDOne = "postSkip-DurationUserOne";
    const VIPLockUser = "VIPUser-lockCategories";
    const videoID = "lockedVideo";
    const userID = userIDOne;

    const segment = {
        segment: [0, 10],
        category: "sponsor",
    };
    const dbFormatSegment = convertSingleToDBFormat(segment);

    before(async () => {
        const insertLockCategoriesQuery = `INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") VALUES(?, ?, ?, ?)`;
        await db.prepare("run", insertLockCategoriesQuery, [getHash(VIPLockUser), videoID, "sponsor", "Custom Reason"]);
        await db.prepare("run", insertLockCategoriesQuery, [getHash(VIPLockUser), videoID, "intro", ""]);
    });

    it("Should be able to submit with empty user-agent", (done) => {
        const videoID = "userAgent-3";
        client(endpoint, {
            method: "POST",
            data: {
                userID,
                videoID,
                segments: [segment],
                userAgent: "",
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryUseragent(videoID);
                const expected = {
                    ...dbFormatSegment,
                    userAgent: "",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with custom userAgent in body", (done) => {
        const videoID = "userAgent-4";
        client(endpoint, {
            method: "POST",
            data: {
                userID,
                videoID,
                segments: [segment],
                userAgent: "MeaBot/5.0"
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryUseragent(videoID);
                const expected = {
                    ...dbFormatSegment,
                    userAgent: "MeaBot/5.0",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with custom user-agent 1", (done) => {
        const videoID = "userAgent-1";
        client(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.youtube/5.0"
            },
            data: {
                userID,
                videoID,
                segments: [segment],
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryUseragent(videoID);
                const expected = {
                    ...dbFormatSegment,
                    userAgent: "Vanced/5.0",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });
});
