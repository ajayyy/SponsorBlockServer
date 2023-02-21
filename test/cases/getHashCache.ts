import { config } from "../../src/config";
import { getHashCache } from "../../src/utils/getHashCache";
import { shaHashKey } from "../../src/utils/redisKeys";
import { getHash } from "../../src/utils/getHash";
import redis from "../../src/utils/redis";
import assert from "assert";
import { setTimeout } from "timers/promises";
import { genRandom } from "../utils/getRandom";

const rand1Hash = genRandom(24);
const rand1Hash_Key = getHash(rand1Hash, 1);
const rand1Hash_Result = getHash(rand1Hash);

describe("getHashCache test", function() {
    before(function() {
        if (!config.redis?.enabled) this.skip();
    });
    it("Should set hashKey and be able to retreive", (done) => {
        const redisKey = shaHashKey(rand1Hash_Key);
        getHashCache(rand1Hash)
            .then(() => setTimeout(50)) // add timeout for redis to complete async
            .then(() => redis.get(redisKey))
            .then(result => {
                assert.strictEqual(result, rand1Hash_Result);
                done();
            })
            .catch(err => done(err === undefined ? "no set value" : err));
    }).timeout(5000);
});