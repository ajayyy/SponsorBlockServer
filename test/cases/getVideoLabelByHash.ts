import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { getHash } from "../../src/utils/getHash";

describe("getVideoLabelHash", () => {
    const endpoint = "/api/videoLabels";
    before(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "hashedVideoID", "votes", "locked", "UUID", "userID", "timeSubmitted", "category", "actionType", "hidden", "shadowHidden", "startTime", "endTime", "views") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)';
        await db.prepare("run", query, ["getLabelHashSponsor"   , getHash("getLabelHashSponsor", 1)    , 2, 0, "labelhash01", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashEA"        , getHash("getLabelHashEA", 1)         , 2, 0, "labelhash02", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashSelfpromo" , getHash("getLabelHashSelfpromo", 1)  , 2, 0, "labelhash03", "labeluser", 0, "selfpromo", "full", 0, 0]);
        // priority override
        await db.prepare("run", query, ["getLabelHashPriority"  , getHash("getLabelHashPriority", 1)  , 2, 0, "labelhash04", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashPriority"  , getHash("getLabelHashPriority", 1)  , 2, 0, "labelhash05", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashPriority"  , getHash("getLabelHashPriority", 1)  , 2, 0, "labelhash06", "labeluser", 0, "selfpromo", "full", 0, 0]);
        // locked only
        await db.prepare("run", query, ["getLabelHashLocked"    , getHash("getLabelHashLocked", 1)  , 2, 0, "labelhash07", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashLocked"    , getHash("getLabelHashLocked", 1)  , 2, 0, "labelhash08", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashLocked"    , getHash("getLabelHashLocked", 1)  , 2, 1, "labelhash09", "labeluser", 0, "selfpromo", "full", 0, 0]);
        // hidden segments
        await db.prepare("run", query, ["getLabelHashDownvote"  , getHash("getLabelHashDownvote", 1)  , -2, 0, "labelhash10", "labeluser", 0, "selfpromo", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashHidden"    , getHash("getLabelHashHidden", 1)  , 2, 0, "labelhash11", "labeluser", 0, "selfpromo", "full", 1, 0]);
        await db.prepare("run", query, ["getLabelHashShHidden"  , getHash("getLabelHashShHidden", 1)  , 2, 0, "labelhash12", "labeluser", 0, "selfpromo", "full", 0, 1]);
        // priority override2
        await db.prepare("run", query, ["getLabelHashPriority2" , getHash("getLabelHashPriority2", 1)  , -2, 0, "labelhash13", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashPriority2" , getHash("getLabelHashPriority2", 1)  , 2, 0, "labelhash14", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHashPriority2" , getHash("getLabelHashPriority2", 1)  , 2, 0, "labelhash15", "labeluser", 0, "selfpromo", "full", 0, 0]);

        return;
    });

    function validateLabel(data: any, videoID: string) {
        assert.strictEqual(data[0].videoID, videoID);
        assert.strictEqual(data[0].segments.length, 1);
    }

    const get = (videoID: string) => client.get(`${endpoint}/${getHash(videoID, 1).substring(0, 4)}`);

    it("Should be able to get sponsor only label", (done) => {
        const videoID = "getLabelHashSponsor";
        get(videoID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data, videoID);
                const result = data[0].segments[0];
                assert.strictEqual(result.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get exclusive access only label", (done) => {
        const videoID = "getLabelHashEA";
        get(videoID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data, videoID);
                const result = data[0].segments[0];
                assert.strictEqual(result.category, "exclusive_access");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get selfpromo only label", (done) => {
        const videoID = "getLabelHashSelfpromo";
        get(videoID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data, videoID);
                const result = data[0].segments[0];
                assert.strictEqual(result.category, "selfpromo");
                done();
            })
            .catch(err => done(err));
    });

    it("Should get only sponsor if multiple segments exist", (done) => {
        const videoID = "getLabelHashPriority";
        get(videoID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data, videoID);
                const result = data[0].segments[0];
                assert.strictEqual(result.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should override priority if locked", (done) => {
        const videoID = "getLabelHashLocked";
        get(videoID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data, videoID);
                const result = data[0].segments[0];
                assert.strictEqual(result.category, "selfpromo");
                done();
            })
            .catch(err => done(err));
    });

    it("Should get highest priority category", (done) => {
        const videoID = "getLabelHashPriority2";
        get(videoID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data, videoID);
                const result = data[0].segments[0];
                assert.strictEqual(result.category, "exclusive_access");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if all submissions are downvoted", (done) => {
        get("getLabelHashDownvote")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if all submissions are hidden", (done) => {
        get("getLabelHashHidden")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if all submissions are shadowhidden", (done) => {
        get("getLabelHashShHidden")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if no segment found", (done) => {
        get("notarealvideo")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should get 400 if no videoID passed in", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});
