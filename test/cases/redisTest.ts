import { config } from "../../src/config";
import redis from "../../src/utils/redis";
import crypto from "crypto";
import assert from "assert";

const randomID = crypto.pseudoRandomBytes(8).toString("hex");

describe("redis test", function() {
    before(async function() {
        if (!config.redis) this.skip();
        await redis.setAsync(randomID, "test");
    });
    it("Should get stored value", (done) => {
        redis.getAsync(randomID)
            .then(res => {
                if (res.err) assert.fail(res.err);
                assert.strictEqual(res.reply, "test");
                done();
            });
    });
});