import { db } from "../../../src/databases/databases";
import { getHash } from "../../../src/utils/getHash";
import assert from "assert";
import { client } from "../../utils/httpClient";
import { AxiosResponse } from "axios";
import { partialDeepEquals, arrayPartialDeepEquals } from "../../utils/partialDeepEquals";

const endpoint = "/api/ratings/rate";
const getRating = (hash: string, params?: unknown): Promise<AxiosResponse> => client.get(`${endpoint}/${hash}`, { params });
const getBulkRating = (hashes: string[], params?: any): Promise<AxiosResponse> => client.get(endpoint, { params: { ...params, prefix: hashes } });

const videoOneID = "some-likes-and-dislikes";
const videoOneIDHash = getHash(videoOneID, 1);
const videoOnePartialHash = videoOneIDHash.substr(0, 4);
const videoTwoID = "some-likes-and-dislikes-2";
const videoTwoIDHash = getHash(videoTwoID, 1);
const videoTwoPartialHash = videoTwoIDHash.substr(0, 4);

describe("getRating", () => {
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "ratings" ("videoID", "service", "type", "count", "hashedVideoID") VALUES (?, ?, ?, ?, ?)';
        await db.prepare("run", insertUserNameQuery, [videoOneID, "YouTube", 0, 5, videoOneIDHash]);
        await db.prepare("run", insertUserNameQuery, [videoOneID, "YouTube", 1, 10, videoOneIDHash]);

        await db.prepare("run", insertUserNameQuery, [videoTwoID, "YouTube", 0, 20, videoTwoIDHash]);
        await db.prepare("run", insertUserNameQuery, [videoTwoID, "YouTube", 1, 30, videoTwoIDHash]);
    });

    it("Should be able to get dislikes and likes by default", (done) => {
        getRating(videoOnePartialHash)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    type: 0,
                    count: 5,
                }, {
                    type: 1,
                    count: 10,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter for only dislikes", (done) => {
        getRating(videoOnePartialHash, { type: 0 })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    type: 0,
                    count: 5,
                }];
                assert.ok(partialDeepEquals(res.data, expected));

                done();
            })
            .catch(err => done(err));
    });

    /*
    This test will fail if tests are already ran with redis.
    */
    it("Should be able to bulk fetch", (done) => {
        getBulkRating([videoOnePartialHash, videoTwoPartialHash])
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    type: 0,
                    count: 20,
                    hash: videoTwoIDHash,
                },
                {
                    type: 1,
                    count: 30,
                    hash: videoTwoIDHash,
                }, {
                    type: 0,
                    count: 5,
                    hash: videoOneIDHash,
                }, {
                    type: 1,
                    count: 10,
                    hash: videoOneIDHash,
                }];
                assert.ok(arrayPartialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for invalid hash", (done) => {
        getRating("a")
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 for nonexitent type", (done) => {
        getRating(videoOnePartialHash, { type: 100 })
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 for nonexistent videoID", (done) => {
        getRating("aaaa")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });
});