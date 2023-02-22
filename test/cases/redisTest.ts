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
    it("Should get stored value", (done) => {
        redis.get(randKey1)
            .then(res => {
                assert.strictEqual(res, randValue1);
                done();
            }).catch(err => done(err));
    });
    it("Should not be able to get not stored value", (done) => {
        redis.get(randKey2)
            .then(res => {
                if (res) done("Value should not be found");
                done();
            }).catch(err => done(err));
    });
    it("Should be able to delete stored value", (done) => {
        redis.del(randKey1)
            .then(() => {
                redis.get(randKey1)
                    .then(res => {
                        assert.strictEqual(res, null);
                        done();
                    }).catch(err => done(err));
            }).catch(err => done(err));
    });
    it("Should be able to set expiring value", (done) => {
        redis.setEx(randKey3, 8400, randValue3)
            .then(() => {
                redis.get(randKey3)
                    .then(res => {
                        assert.strictEqual(res, randValue3);
                        done();
                    }).catch(err => done(err));
            }).catch(err => done(err));
    });
    it("Should continue when undefined value is fetched", (done) => {
        const undefkey = `undefined.${genRandom()}`;
        redis.get(undefkey)
            .then(result => {
                assert.ok(!result); // result should be falsy
                done();
            });
    });
});