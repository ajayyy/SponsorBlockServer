import { config } from "../../src/config";
import redis from "../../src/utils/redis";
import crypto from "crypto";
import assert from "assert";

const genRandom = (bytes=8) => crypto.pseudoRandomBytes(bytes).toString("hex");

const randKey1 = genRandom();
const randValue1 = genRandom();
const randKey2 = genRandom(16);

describe("redis test", function() {
    before(async function() {
        if (!config.redis?.enabled) this.skip();
        await redis.set(randKey1, randValue1);
    });
    it("Should get stored value", (done) => {
        redis.get(randKey1)
            .then(res => {
                assert.strictEqual(res, randValue1);
                done();
            }).catch(err => assert.fail(err));
    });
    it("Should not be able to get not stored value", (done) => {
        redis.get(randKey2)
            .then(res => {
                if (res) assert.fail("Value should not be found");
                done();
            }).catch(err => assert.fail(err));
    });
});