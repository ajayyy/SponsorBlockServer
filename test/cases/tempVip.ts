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

const permVIP1 = "tempVip_permaVIPOne";
const publicPermVIP1 = getHash(permVIP1) as HashedUserID;
const permVIP2 = "tempVip_permaVIPTwo";
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
const checkUserVIP = async (publicID: HashedUserID): Promise<string> =>
    await redis.get(tempVIPKey(publicID));

describe("tempVIP test", function() {
    before(async function() {
        if (!config.redis?.enabled) this.skip();

        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "shadowHidden") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimeQuery, ["channelid-convert",   0, 1, 0, 0, UUID0, "testman", 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimeQuery, ["channelid-convert",   1, 9, 0, 1, "tempvip-submit", publicTempVIPOne, 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimeQuery, ["otherchannel",        1, 9, 0, 1, UUID1, "testman", 0, 50, "sponsor", 0]);

        await db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [publicPermVIP1]);
        await db.prepare("run", 'INSERT INTO "vipUsers" ("userID") VALUES (?)', [publicPermVIP2]);
        // clear redis if running consecutive tests
        await redis.del(tempVIPKey(publicTempVIPOne));
    });

    it("Should update db version when starting the application", async () => {
        const row = await privateDB.prepare("get", "SELECT key, value FROM config where key = ?", ["version"]);
        assert.ok(row.value >= 5, `Versions are not at least 5. private is ${row.value}`);
    });
    it("User should not already be temp VIP", async () => {
        assert.ok(!await checkUserVIP(publicTempVIPOne));
        const row = await privateDB.prepare("get", `SELECT * FROM "tempVipLog" WHERE "targetUserID" = ?`, [publicTempVIPOne]);
        assert.ok(!row?.enabled);
    });
    it("Should be able to normal upvote as a user", async () => {
        const res = await postVote(tempVIPOne, UUID0, 1);
        assert.strictEqual(res.status, 200);
        const row = await getSegment(UUID0);
        assert.strictEqual(row.votes, 1);
    });
    it("Should be able to add tempVIP", async () => {
        const res = await addTempVIP("true", permVIP1, publicTempVIPOne);
        assert.strictEqual(res.status, 200);
        // check redis
        const vip = await checkUserVIP(publicTempVIPOne);
        assert.strictEqual(vip, "ChannelID");
        assert.strictEqual(res.data, "Temp VIP added on channel ChannelAuthor");
        // check privateDB
        const row = await privateDB.prepare("get", `SELECT * FROM "tempVipLog" WHERE "targetUserID" = ?`, [publicTempVIPOne]);
        assert.ok(row.enabled);
    });
    it("Should be able to VIP downvote", async () => {
        const res = await postVote(tempVIPOne, UUID0, 0);
        assert.strictEqual(res.status, 200);
        const row = await getSegment(UUID0);
        assert.strictEqual(row.votes, -2);
    });
    it("Should not be able to lock segment", async () => {
        const res = await postVote(tempVIPOne, UUID0, 1);
        assert.strictEqual(res.status, 200);
        const row = await getSegment(UUID0);
        assert.strictEqual(row.votes, 1);
        assert.strictEqual(row.locked, 0);
    });
    it("Should be able to change category but not lock", async () => {
        const res = await postVoteCategory(tempVIPOne, UUID0, "filler");
        assert.strictEqual(res.status, 200);
        const row = await getSegment(UUID0);
        assert.strictEqual(row.category, "filler");
        assert.strictEqual(row.locked, 0);
    });
    it("Should be able to remove tempVIP prematurely", async () => {
        const res = await addTempVIP("false", permVIP1, publicTempVIPOne);
        assert.strictEqual(res.status, 200);
        const vip = await checkUserVIP(publicTempVIPOne);
        assert.strictEqual(res.data, "Temp VIP removed");
        assert.ok(!vip, "Should be no listed channelID");
    });
    it("Should not be able to VIP downvote", async () => {
        const res = await postVote(tempVIPOne, UUID1, 0);
        assert.strictEqual(res.status, 200);
        const row = await getSegment(UUID1);
        assert.strictEqual(row.votes, 0);
    });
    it("Should not be able to VIP change category", async () => {
        const res = await postVoteCategory(tempVIPOne, UUID1, "filler");
        assert.strictEqual(res.status, 200);
        const row = await getSegment(UUID1);
        assert.strictEqual(row.category, "sponsor");
    });
    // error code testing
    it("Should be able to add tempVIP after removal", async () => {
        const res = await addTempVIP("true", permVIP1, publicTempVIPOne);
        assert.strictEqual(res.status, 200);
        const vip = await checkUserVIP(publicTempVIPOne);
        assert.strictEqual(vip, "ChannelID");
    });
    it("Should not be able to add VIP without existing VIP (403)", async () => {
        const privateID = "non-vip-privateid";
        const res = await addTempVIP("true", privateID, publicTempVIPOne);
        assert.strictEqual(res.status, 403);
        const vip = await checkUserVIP(getHash(privateID) as HashedUserID);
        assert.ok(!vip, "Should be no listed channelID");
    });
    it("Should not be able to add permanant VIP as temporary VIP (409)", async () => {
        const res = await addTempVIP("true", permVIP1, publicPermVIP2);
        assert.strictEqual(res.status, 409);
        const vip = await checkUserVIP(publicPermVIP2);
        assert.ok(!vip, "Should be no listed channelID");
    });
    it("Temp VIP should not be able to add another Temp VIP (403)", async () => {
        const privateID = "non-vip-privateid";
        const publicID = getHash(privateID) as HashedUserID;
        const res = await addTempVIP("true", tempVIPOne, publicID);
        assert.strictEqual(res.status, 403);
        const vip = await checkUserVIP(publicID);
        assert.ok(!vip, "Should be no listed channelID");
    });
    // error 40X testing
    it("Should return 404 with invalid videoID", async () => {
        const privateID = "non-vip-privateid";
        const publicID = getHash(privateID) as HashedUserID;
        const res = await addTempVIP("true", permVIP1, publicID, "knownWrongID");
        assert.strictEqual(res.status, 404);
        const vip = await checkUserVIP(publicID);
        assert.ok(!vip, "Should be no listed channelID");
    });
    it("Should return 400 with invalid userID", async () => {
        const res = await addTempVIP("true", permVIP1, "" as HashedUserID, "knownWrongID");
        assert.strictEqual(res.status, 400);
    });
    it("Should return 400 with invalid adminUserID", async () => {
        const res = await addTempVIP("true", "", publicTempVIPOne);
        assert.strictEqual(res.status, 400);
    });
    it("Should return 400 with invalid channelID", async () => {
        const res = await addTempVIP("true", permVIP1, publicTempVIPOne, "");
        assert.strictEqual(res.status, 400);
    });
});
