import { config } from "../../src/config";
import { getHash } from "../../src/utils/getHash";
import { tempVIPKey } from "../../src/utils/redisKeys";
import { HashedUserID } from "../../src/types/user.model";
import { client } from "../utils/httpClient";
import { db, privateDB } from "../../src/databases/databases";
import redis from "../../src/utils/redis";
import assert from "assert";

// helpers
const getSegment = (UUID: string) => db.prepare("get", `SELECT "votes", "locked", "category" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);

const permVIP = "tempVipPermOne";
const publicPermVIP = getHash(permVIP) as HashedUserID;
const tempVIPOne = "tempVipTempOne";
const publicTempVIPOne = getHash(tempVIPOne) as HashedUserID;
const UUID0 = "tempvip-uuid0";
const UUID1 = "tempvip-uuid1";

const tempVIPEndpoint = "/api/addUserAsTempVIP";
const addTempVIP = (enabled: boolean) => client({
    url: tempVIPEndpoint,
    method: "POST",
    params: {
        userID: publicTempVIPOne,
        adminUserID: permVIP,
        channelVideoID: "channelid-convert",
        enabled: enabled
    }
});
const voteEndpoint = "/api/voteOnSponsorTime";
const postVote = (userID: string, UUID: string, type: number) => client({
    method: "POST",
    url: voteEndpoint,
    params: {
        userID,
        UUID,
        type
    }
});
const postVoteCategory = (userID: string, UUID: string, category: string) => client({
    method: "POST",
    url: voteEndpoint,
    params: {
        userID,
        UUID,
        category
    }
});
const checkUserVIP = async () => {
    const { reply } = await redis.getAsync(tempVIPKey(publicTempVIPOne));
    return reply;
};

describe("tempVIP test", function() {
    before(async function() {
        if (!config.redis) this.skip();

        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "shadowHidden") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimeQuery, ["channelid-convert",   0, 1, 0, 0, UUID0, "testman", 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimeQuery, ["channelid-convert",   1, 9, 0, 1, "tempvip-submit", publicTempVIPOne, 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimeQuery, ["otherchannel",        1, 9, 0, 1, UUID1, "testman", 0, 50, "sponsor", 0]);


        await db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [publicPermVIP]);
        // clear redis if running consecutive tests
        await redis.delAsync(tempVIPKey(publicTempVIPOne));
    });

    it("Should update db version when starting the application", () => {
        privateDB.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])
            .then(row => {
                assert.ok(row.value >= 5, `Versions are not at least 5. private is ${row.value}`);
            });
    });
    it("User should not already be temp VIP", (done) => {
        checkUserVIP()
            .then(result => {
                assert.ok(!result);
                done(result);
            })
            .catch(err => done(err));
    });
    it("Should be able to normal upvote as a user", (done) => {
        postVote(tempVIPOne, UUID0, 1)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(UUID0);
                assert.strictEqual(row.votes, 1);
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to add tempVIP", (done) => {
        addTempVIP(true)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const vip = await checkUserVIP();
                assert.ok(vip == "ChannelID");
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to VIP downvote", (done) => {
        postVote(tempVIPOne, UUID0, 0)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(UUID0);
                assert.strictEqual(row.votes, -2);
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to VIP lock", (done) => {
        postVote(tempVIPOne, UUID0, 1)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(UUID0);
                assert.ok(row.votes > -2);
                assert.strictEqual(row.locked, 1);
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to VIP change category", (done) => {
        postVoteCategory(tempVIPOne, UUID0, "filler")
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(UUID0);
                assert.strictEqual(row.category, "filler");
                assert.strictEqual(row.locked, 1);
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to remove tempVIP prematurely", (done) => {
        addTempVIP(false)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const vip = await checkUserVIP();
                done(vip);
            })
            .catch(err => done(err));
    });
    it("Should not be able to VIP downvote", (done) => {
        postVote(tempVIPOne, UUID1, 0)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(UUID1);
                assert.strictEqual(row.votes, 0);
                done();
            })
            .catch(err => done(err));
    });
    it("Should not be able to VIP change category", (done) => {
        postVoteCategory(tempVIPOne, UUID1, "filler")
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(UUID1);
                assert.strictEqual(row.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });
});