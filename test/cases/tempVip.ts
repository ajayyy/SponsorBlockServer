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

const permVIP1 = "tempVipPermOne";
const publicPermVIP1 = getHash(permVIP1) as HashedUserID;
const permVIP2 = "tempVipPermOne";
const publicPermVIP2 = getHash(permVIP2) as HashedUserID;

const tempVIPOne = "tempVipTempOne";
const publicTempVIPOne = getHash(tempVIPOne) as HashedUserID;
const UUID0 = "tempvip-uuid0";
const UUID1 = "tempvip-uuid1";

const tempVIPEndpoint = "/api/addUserAsTempVIP";
const addTempVIP = (enabled: string, adminUserID: string, userID: HashedUserID, channelVideoID = "channelid-convert") => client({
    url: tempVIPEndpoint,
    method: "POST",
    params: {
        userID,
        adminUserID,
        channelVideoID,
        enabled
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
const checkUserVIP = async (publicID: HashedUserID) => {
    const { reply } = await redis.getAsync(tempVIPKey(publicID));
    return reply;
};

describe("tempVIP test", function() {
    before(async function() {
        if (!config.redis) this.skip();

        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "shadowHidden") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimeQuery, ["channelid-convert",   0, 1, 0, 0, UUID0, "testman", 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimeQuery, ["channelid-convert",   1, 9, 0, 1, "tempvip-submit", publicTempVIPOne, 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimeQuery, ["otherchannel",        1, 9, 0, 1, UUID1, "testman", 0, 50, "sponsor", 0]);


        await db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [publicPermVIP1]);
        await db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [publicPermVIP2]);
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
        checkUserVIP(publicTempVIPOne)
            .then(result => {
                assert.ok(!result);
            })
            .then(async () => {
                const row = await privateDB.prepare("get", `SELECT * FROM "tempVipLog" WHERE "targetUserID" = ?`, [publicTempVIPOne]);
                assert.ok(!row?.enabled);
                done();
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
        addTempVIP("true", permVIP1, publicTempVIPOne)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                // check redis
                const vip = await checkUserVIP(publicTempVIPOne);
                assert.strictEqual(vip, "ChannelID");
                assert.strictEqual(res.data, "Temp VIP added on channel ChannelAuthor");
                // check privateDB
                const row = await privateDB.prepare("get", `SELECT * FROM "tempVipLog" WHERE "targetUserID" = ?`, [publicTempVIPOne]);
                assert.ok(row.enabled);
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
        addTempVIP("false", permVIP1, publicTempVIPOne, null)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const vip = await checkUserVIP(publicTempVIPOne);
                assert.strictEqual(res.data, "Temp VIP removed");
                assert.ok(!vip, "Should be no listed channelID");
                done();
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
    // error code testing
    it("Should be able to add tempVIP after removal", (done) => {
        addTempVIP("true", permVIP1, publicTempVIPOne)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const vip = await checkUserVIP(publicTempVIPOne);
                assert.strictEqual(vip, "ChannelID");
                done();
            })
            .catch(err => done(err));
    });
    it("Should not be able to add VIP without existing VIP (403)", (done) => {
        const privateID = "non-vip-privateid";
        addTempVIP("true", privateID, publicTempVIPOne)
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const vip = await checkUserVIP(getHash(privateID) as HashedUserID);
                assert.ok(!vip, "Should be no listed channelID");
                done();
            })
            .catch(err => done(err));
    });
    it("Should not be able to add permanant VIP as temporary VIP (409)", (done) => {
        addTempVIP("true", permVIP1, publicPermVIP2)
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const vip = await checkUserVIP(publicPermVIP2);
                assert.ok(!vip, "Should be no listed channelID");
                done();
            })
            .catch(err => done(err));
    });
    it("Temp VIP should not be able to add another Temp VIP (403)", (done) => {
        const privateID = "non-vip-privateid";
        const publicID = getHash(privateID) as HashedUserID;
        addTempVIP("true", tempVIPOne, publicID)
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const vip = await checkUserVIP(publicID);
                assert.ok(!vip, "Should be no listed channelID");
                done();
            })
            .catch(err => done(err));
    });
    // error 40X testing
    it("Should return 404 with invalid videoID", (done) => {
        const privateID = "non-vip-privateid";
        const publicID = getHash(privateID) as HashedUserID;
        addTempVIP("true", permVIP1, publicID, "knownWrongID")
            .then(async res => {
                assert.strictEqual(res.status, 404);
                const vip = await checkUserVIP(publicID);
                assert.ok(!vip, "Should be no listed channelID");
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 with invalid userID", (done) => {
        addTempVIP("true", permVIP1, "" as HashedUserID, "knownWrongID")
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 with invalid adminUserID", (done) => {
        addTempVIP("true", "", publicTempVIPOne)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 with invalid channelID", (done) => {
        addTempVIP("true", permVIP1, publicTempVIPOne, "")
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});