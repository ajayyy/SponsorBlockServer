import { config } from "../../src/config";
import { tempVIPKey } from "../../src/utils/redisKeys";
import { HashedUserID } from "../../src/types/user.model";
import { client } from "../utils/httpClient";
import { db, privateDB } from "../../src/databases/databases";
import redis from "../../src/utils/redis";
import { genAnonUser, genUser } from "../utils/genUser";
import assert from "assert";
import { insertSegment } from "../utils/segmentQueryGen";
import { genRandomValue } from "../utils/getRandom";
import { insertVipUser } from "../utils/queryGen";

// helpers
const getSegment = (UUID: string) => db.prepare("get", `SELECT "votes", "locked", "category" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);

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

const checkVipLog = async (publicID: string): Promise<boolean> => {
    const row = await privateDB.prepare("get", `SELECT * FROM "tempVipLog" WHERE "targetUserID" = ?`, [publicID]);
    return Boolean(row?.enabled);
};


const permVIP1 = genUser("tempVip", "permVIP1");
const permVIP2 = genUser("tempVip", "permVIP2");

const tempVIP1 = genUser("tempVip", "tempVIP1");

const targetChannelUUID = genRandomValue("uuid", "channelid-target");
const otherChannelUUID = genRandomValue("uuid", "otherchannel");

describe("tempVIP test", function() {
    before(async function() {
        if (!config.redis?.enabled) this.skip();
        // insert segments
        insertSegment(db, { videoID: "channelid-convert", UUID: targetChannelUUID });
        insertSegment(db, { videoID: "channelid-convert", userID: tempVIP1.pubID, locked: true });
        insertSegment(db, { videoID: "otherchannel", UUID: otherChannelUUID, locked: true });
        // add vip user
        insertVipUser(db, permVIP1);
        insertVipUser(db, permVIP2);
        // clear redis if running consecutive tests
        await redis.del(tempVIPKey(tempVIP1.pubID));
    });

    it("Should update db version when starting the application", () => {
        privateDB.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])
            .then(row =>
                assert.ok(row.value >= 5, `Versions are not at least 5. private is ${row.value}`)
            );
    });
    it("User should not already be temp VIP", () =>
        checkUserVIP(tempVIP1.pubID)
            .then(result => {
                assert.ok(!result);
            })
            .then(async () => {
                const log = await checkVipLog(tempVIP1.pubID);
                assert.strictEqual(log, false);
            })
    );
    it("Should be able to normal upvote as a user", () =>
        postVote(tempVIP1.privID, targetChannelUUID, 1)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(targetChannelUUID);
                assert.strictEqual(row.votes, 1);
            })
    );
    it("Should be able to add tempVIP", () =>
        addTempVIP("true", permVIP1.privID, tempVIP1.pubID)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                // check redis
                const vip = await checkUserVIP(tempVIP1.pubID);
                assert.strictEqual(vip, "ChannelID");
                assert.strictEqual(res.data, "Temp VIP added on channel ChannelAuthor");
                // check privateDB
                const log = await checkVipLog(tempVIP1.pubID);
                assert.strictEqual(log, true);
            })
    );
    it("Should be able to VIP downvote", () =>
        postVote(tempVIP1.privID, targetChannelUUID, 0)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(targetChannelUUID);
                assert.strictEqual(row.votes, -2);
            })
    );
    it("Should not be able to lock segment", () =>
        postVote(tempVIP1.privID, targetChannelUUID, 1)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(targetChannelUUID);
                assert.strictEqual(row.votes, 1);
                assert.strictEqual(row.locked, 0);
            })
    );
    it("Should be able to change category but not lock", () =>
        postVoteCategory(tempVIP1.privID, targetChannelUUID, "filler")
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(targetChannelUUID);
                assert.strictEqual(row.category, "filler");
                assert.strictEqual(row.locked, 0);
            })
    );
    it("Should be able to remove tempVIP prematurely", () =>
        addTempVIP("false", permVIP1.privID, tempVIP1.pubID)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const vip = await checkUserVIP(tempVIP1.pubID);
                assert.strictEqual(res.data, "Temp VIP removed");
                assert.ok(!vip, "Should be no listed channelID");
            })
    );
    it("Should not be able to VIP downvote", () =>
        postVote(tempVIP1.privID, otherChannelUUID, 0)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(otherChannelUUID);
                assert.strictEqual(row.votes, 0);
            })
    );
    it("Should not be able to VIP change category", () =>
        postVoteCategory(tempVIP1.privID, otherChannelUUID, "filler")
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getSegment(otherChannelUUID);
                assert.strictEqual(row.category, "sponsor");
            })
    );
    // error code testing
    it("Should be able to add tempVIP after removal", () =>
        addTempVIP("true", permVIP1.privID, tempVIP1.pubID)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const vip = await checkUserVIP(tempVIP1.pubID);
                assert.strictEqual(vip, "ChannelID");
            })
    );
    it("Should not be able to add VIP without existing VIP (403)", () => {
        const testUser = genAnonUser();
        return addTempVIP("true", testUser.privID, tempVIP1.pubID)
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const vip = await checkUserVIP(testUser.pubID);
                assert.ok(!vip, "Should be no listed channelID");
            });
    });
    it("Should not be able to add permanant VIP as temporary VIP (409)", () =>
        addTempVIP("true", permVIP1.privID, permVIP2.pubID)
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const vip = await checkUserVIP(permVIP2.pubID);
                assert.ok(!vip, "Should be no listed channelID");
            })
    );
    it("Temp VIP should not be able to add another Temp VIP (403)", () => {
        const testUser = genAnonUser();
        return addTempVIP("true", tempVIP1.privID, testUser.pubID)
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const vip = await checkUserVIP(testUser.pubID);
                assert.ok(!vip, "Should be no listed channelID");
            });
    });
    // error 40X testing
    it("Should return 404 with invalid videoID", () => {
        const testUser = genAnonUser();
        return addTempVIP("true", permVIP1.privID, testUser.pubID, "knownWrongID")
            .then(async res => {
                assert.strictEqual(res.status, 404);
                const vip = await checkUserVIP(testUser.pubID);
                assert.ok(!vip, "Should be no listed channelID");
            });
    });
    it("Should return 400 with invalid userID", () => {
        const videoID = genRandomValue("videoID", "badVideoID");
        return addTempVIP("true", permVIP1.privID, "" as HashedUserID, videoID)
            .then(res => assert.strictEqual(res.status, 400));
    });
    it("Should return 400 with invalid adminUserID", () =>
        addTempVIP("true", "", tempVIP1.pubID)
            .then(res => assert.strictEqual(res.status, 400))
    );
    it("Should return 400 with invalid channelID", () =>
        addTempVIP("true", permVIP1.privID, tempVIP1.pubID, "")
            .then(res => assert.strictEqual(res.status, 400))
    );
});