import { config } from "../../src/config";
import redis from "../../src/utils/redis";
import assert from "assert";
import { genRandom } from "../utils/getRandom";

const randKey1 = genRandom();
const randValue1 = genRandom();
const randKey2 = genRandom(16);
const randKey3 = genRandom();
const randValue3 = genRandom();

describe("redis test", function() {
    before(async function() {
        if (!config.redis?.enabled) this.skip();
        await redis.set(randKey1, randValue1);
    });
    it("Should get stored value", async () => {
        const res = await redis.get(randKey1);
        assert.strictEqual(res, randValue1);
    });
    it("Should not be able to get not stored value", async () => {
        const res = await redis.get(randKey2);
        assert.strictEqual(res, null, "Value should not be found");
    });
    it("Should be able to delete stored value", async () => {
        await redis.del(randKey1);
        const res = await redis.get(randKey1);
        assert.strictEqual(res, null, "Deleted key should not be found");
    });
    it("Should be able to set expiring value", async () => {
        await redis.setEx(randKey3, 8400, randValue3);
        const res = await redis.get(randKey3);
        assert.strictEqual(res, randValue3);
    });
    it("Should continue when undefined value is fetched", async () => {
        const undefkey = `undefined.${genRandom()}`;
        const res = await redis.get(undefkey);
        assert.strictEqual(res, null);
    });
});
