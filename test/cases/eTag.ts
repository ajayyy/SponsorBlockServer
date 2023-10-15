import assert from "assert";
import { client } from "../utils/httpClient";
import redis from "../../src/utils/redis";
import { config } from "../../src/config";
import { genRandom } from "../utils/getRandom";

const validateEtag = (expected: string, actual: string): boolean => {
    const [actualHashType, actualHashKey, actualService] = actual.split(";");
    const [expectedHashType, expectedHashKey, expectedService] = expected.split(";");
    return (actualHashType === expectedHashType) && (actualHashKey === expectedHashKey) && (actualService === expectedService);
};

describe("eTag", () => {
    before(function() {
        if (!config.redis?.enabled) this.skip();
    });

    const endpoint = "/etag";
    it("Should reject weak etag", () => {
        const etagKey = `W/test-etag-${genRandom()}`;
        return client.get(endpoint, { headers: { "If-None-Match": etagKey } })
            .then(res => assert.strictEqual(res.status, 404));
    });
});

describe("304 etag validation", () => {
    before(function() {
        if (!config.redis?.enabled) this.skip();
    });

    const endpoint = "/etag";
    for (const hashType of ["skipSegments", "skipSegmentsHash", "videoLabel", "videoLabelHash"]) {
        it(`${hashType} etag should return 304`, () => {
            const etagKey = `${hashType};${genRandom};YouTube;${Date.now()}`;
            return redis.setEx(etagKey, 8400, "test").then(() =>
                client.get(endpoint, { headers: { "If-None-Match": etagKey } }).then(res => {
                    assert.strictEqual(res.status, 304);
                    const etag = res.headers?.etag ?? "";
                    assert.ok(validateEtag(etagKey, etag));
                })
            );
        });
    }

    it(`other etag type should not return 304`, () => {
        const etagKey = `invalidHashType;${genRandom};YouTube;${Date.now()}`;
        return client.get(endpoint, { headers: { "If-None-Match": etagKey } }).then(res => {
            assert.strictEqual(res.status, 404);
        });
    });

    it(`outdated etag type should not return 304`, () => {
        const etagKey = `skipSegments;${genRandom};YouTube;5000`;
        return client.get(endpoint, { headers: { "If-None-Match": etagKey } }).then(res => {
            assert.strictEqual(res.status, 404);
        });
    });
});