import { db } from "../../../src/databases/databases";
import { getHash } from "../../../src/utils/getHash";
import assert from "assert";
import { client } from "../../utils/httpClient";
import { AxiosResponse } from "axios";
import { partialDeepEquals } from "../../utils/partialDeepEquals";

const endpoint = "/api/ratings/rate/";
const postRating = (body: unknown): Promise<AxiosResponse> => client.post(endpoint, body);
const queryDatabase = (videoID: string) => db.prepare("all", `SELECT * FROM "ratings" WHERE "videoID" = ?`, [videoID]);

const videoIDOne = "normal-video";
const videoIDTwo = "multiple-rates";
const ratingUserID = "rating-testman";

describe("postRating", () => {
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "ratings" ("videoID", "service", "type", "count", "hashedVideoID") VALUES (?, ?, ?, ?, ?)';
        await db.prepare("run", insertUserNameQuery, [videoIDTwo, "YouTube", 0, 3, getHash(videoIDTwo, 1)]);
    });

    it("Should be able to vote on a video", (done) => {
        const videoID = videoIDOne;
        postRating({
            userID: ratingUserID,
            videoID,
            type: 0
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    hashedVideoID: getHash(videoID, 1),
                    videoID,
                    type: 0,
                    count: 1,
                    service: "YouTube"
                }];
                assert.ok(partialDeepEquals(await queryDatabase(videoID), expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to undo a vote on a video", (done) => {
        const videoID = videoIDOne;
        postRating({
            userID: ratingUserID,
            videoID,
            type: 0,
            enabled: false
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    type: 0,
                    count: 0
                }];
                assert.ok(partialDeepEquals(await queryDatabase(videoID), expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to vote after someone else on a video", (done) => {
        const videoID = videoIDTwo;
        postRating({
            userID: ratingUserID,
            videoID,
            type: 0
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    type: 0,
                    count: 4
                }];
                assert.ok(partialDeepEquals(await queryDatabase(videoID), expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to vote a different type than existing votes on a video", (done) => {
        const videoID = videoIDTwo;
        postRating({
            userID: ratingUserID,
            videoID,
            type: 1
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    type: 0,
                    count: 4
                }, {
                    type: 1,
                    count: 1
                }];
                assert.ok(partialDeepEquals(await queryDatabase(videoID), expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to vote with nonexistent type", (done) => {
        const videoID = videoIDOne;
        postRating({
            userID: ratingUserID,
            videoID,
            type: 100
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});