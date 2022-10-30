import { client } from "../utils/httpClient";
import assert from "assert";

describe("getSearchSegments 4xx", () => {
    const endpoint = "/api/searchSegments";

    it("Should return 400 if no videoID", (done) => {
        client.get(endpoint, { params: {} })
            .then(res => {
                assert.strictEqual(res.status, 400);
                const data = res.data;
                assert.strictEqual(data, "videoID not specified");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if invalid categories", (done) => {
        client.get(endpoint, { params: { videoID: "nullVideo", categories: 3 } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                const data = res.data;
                assert.strictEqual(data, "Categories parameter does not match format requirements.");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if invalid actionTypes", (done) => {
        client.get(endpoint, { params: { videoID: "nullVideo", actionTypes: 3 } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                const data = res.data;
                assert.strictEqual(data, "actionTypes parameter does not match format requirements.");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if no segments", (done) => {
        client.get(endpoint, { params: { videoID: "nullVideo", actionType: "chapter" } })
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });
});
