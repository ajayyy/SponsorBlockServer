import assert from "assert";
import { convertSingleToDBFormat } from "./postSkipSegments";
import { db } from "../../src/databases/databases";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { client } from "../utils/httpClient";
import { multiGenProxy } from "../utils/genRandom";
import { genAnonUser } from "../utils/genUser";

const endpoint = "/api/skipSegments";

const queryUseragent = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "userAgent" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
const videoIDs = multiGenProxy("videoID", "postSkipSegmentsUserAgent");

describe("postSkipSegments - userAgent", () => {
    const segment = {
        segment: [0, 10],
        category: "sponsor",
    };
    const dbFormatSegment = convertSingleToDBFormat(segment);
    async function postSubmitSegment(videoID: string, addlData: Record<string, any>) {
        const user = genAnonUser();
        const res = await client(endpoint, {
            method: "POST",
            data: {
                userID: user.privID,
                videoID,
                segments: [segment],
            },
            ...addlData,
        });
        return assert.strictEqual(res.status, 200);
    }

    it("Should be able to submit with empty user-agent", async () => {
        const videoID = videoIDs["ua-empty"];
        const user = genAnonUser();
        await postSubmitSegment(videoID, { data: {
            userID: user.privID,
            videoID,
            segments: [segment],
            userAgent: ""
        } });
        const row = await queryUseragent(videoID);
        const expected = {
            ...dbFormatSegment,
            userAgent: "",
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("Should be able to submit with custom userAgent in body", async () => {
        const videoID = videoIDs["ua-body"];
        const user = genAnonUser();
        await postSubmitSegment(videoID, { data: {
            userID: user.privID,
            videoID,
            segments: [segment],
            userAgent: "MeaBot/5.0"
        } });
        const row = await queryUseragent(videoID);
        const expected = {
            ...dbFormatSegment,
            userAgent: "MeaBot/5.0",
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("Should be able to submit with custom user-agent 1", async () => {
        const videoID = videoIDs["ua-headers"];
        await postSubmitSegment(videoID, { headers: {
            "Content-Type": "application/json",
            "User-Agent": "com.google.android.youtube/5.0"
        } });
        const row = await queryUseragent(videoID);
        const expected = {
            ...dbFormatSegment,
            userAgent: "Vanced/5.0",
        };
        assert.ok(partialDeepEquals(row, expected));
    });
});