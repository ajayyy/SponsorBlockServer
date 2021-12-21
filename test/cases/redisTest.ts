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
        if (!config.redis) this.skip();
        await redis.setAsync(randKey1, randValue1);
    });
    it("Should get stored value", (done) => {
        redis.getAsync(randKey1)
            .then(res => {
                if (res.err) assert.fail(res.err);
                assert.strictEqual(res.reply, randValue1);
                done();
            });
    });
    it("Should not be able to get not stored value", (done) => {
        redis.getAsync(randKey2)
            .then(res => {
                if (res.reply || res.err ) assert.fail("Value should not be found")
                done();
            });
    })
});