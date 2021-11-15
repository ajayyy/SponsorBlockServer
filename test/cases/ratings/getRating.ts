import { db } from "../../../src/databases/databases";
import { getHash } from "../../../src/utils/getHash";
import assert from "assert";
import { client } from "../../utils/httpClient";
import { AxiosResponse } from "axios";
import { partialDeepEquals } from "../../utils/partialDeepEquals";

const endpoint = "/api/ratings/rate/";
const getRating = (hash: string, params?: unknown): Promise<AxiosResponse> => client.get(endpoint + hash, { params });

describe("getRating", () => {
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "ratings" ("videoID", "service", "type", "count", "hashedVideoID") VALUES (?, ?, ?, ?, ?)';
        await db.prepare("run", insertUserNameQuery, ["some-likes-and-dislikes", "YouTube", 0, 5, getHash("some-likes-and-dislikes", 1)]); //b3f0
        await db.prepare("run", insertUserNameQuery, ["some-likes-and-dislikes", "YouTube", 1, 10, getHash("some-likes-and-dislikes", 1)]);
    });

    it("Should be able to get dislikes and likes by default", (done) => {
        getRating("b3f0")
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
        getRating("b3f0", { type: 0 })
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
});