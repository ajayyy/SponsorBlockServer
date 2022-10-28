import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";

describe("getVideoLabels", () => {
    const endpoint = "/api/videoLabels";
    before(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "votes", "locked", "UUID", "userID", "timeSubmitted", "category", "actionType", "hidden", "shadowHidden", "startTime", "endTime", "views") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)';
        await db.prepare("run", query, ["getLabelSponsor"   , 2, 0, "label01", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelEA"        , 2, 0, "label02", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelSelfpromo" , 2, 0, "label03", "labeluser", 0, "selfpromo", "full", 0, 0]);
        // priority override
        await db.prepare("run", query, ["getLabelPriority"  , 2, 0, "label04", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelPriority"  , 2, 0, "label05", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelPriority"  , 2, 0, "label06", "labeluser", 0, "selfpromo", "full", 0, 0]);
        // locked only
        await db.prepare("run", query, ["getLabelLocked"    , 2, 0, "label07", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelLocked"    , 2, 0, "label08", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelLocked"    , 2, 1, "label09", "labeluser", 0, "selfpromo", "full", 0, 0]);
        // hidden segments
        await db.prepare("run", query, ["getLabelDownvote"  ,-2, 0, "label10", "labeluser", 0, "selfpromo", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelHidden"     ,2, 0, "label11", "labeluser", 0, "selfpromo", "full", 1, 0]);
        await db.prepare("run", query, ["getLabelShadowHidden",2, 0, "label12", "labeluser", 0, "selfpromo", "full", 0, 1]);
        // priority override2
        await db.prepare("run", query, ["getLabelPriority2" , -2, 0, "label13", "labeluser", 0, "sponsor", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelPriority2" , 2, 0, "label14", "labeluser", 0, "exclusive_access", "full", 0, 0]);
        await db.prepare("run", query, ["getLabelPriority2" , 2, 0, "label15", "labeluser", 0, "selfpromo", "full", 0, 0]);

        return;
    });

    function validateLabel(result: any) {
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].segment[0], 0);
        assert.strictEqual(result[0].segment[1], 0);
        assert.strictEqual(result[0].actionType, "full");
        assert.strictEqual(result[0].userID, "labeluser");
    }

    const get = (videoID: string) => client.get(endpoint, { params: { videoID } });

    it("Should be able to get sponsor only label", (done) => {
        get("getLabelSponsor")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data);
                assert.strictEqual(data[0].category, "sponsor");
                assert.strictEqual(data[0].UUID, "label01");
                assert.strictEqual(data[0].locked, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get exclusive access only label", (done) => {
        get("getLabelEA")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data);
                assert.strictEqual(data[0].category, "exclusive_access");
                assert.strictEqual(data[0].UUID, "label02");
                assert.strictEqual(data[0].locked, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get selfpromo only label", (done) => {
        get("getLabelSelfpromo")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data);
                assert.strictEqual(data[0].category, "selfpromo");
                assert.strictEqual(data[0].UUID, "label03");
                assert.strictEqual(data[0].locked, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should get only sponsor if multiple segments exist", (done) => {
        get("getLabelPriority")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data);
                assert.strictEqual(data[0].category, "sponsor");
                assert.strictEqual(data[0].UUID, "label04");
                assert.strictEqual(data[0].locked, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should override priority if locked", (done) => {
        get("getLabelLocked")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data);
                assert.strictEqual(data[0].category, "selfpromo");
                assert.strictEqual(data[0].UUID, "label09");
                assert.strictEqual(data[0].locked, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should get highest priority category", (done) => {
        get("getLabelPriority2")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                validateLabel(data);
                assert.strictEqual(data[0].category, "exclusive_access");
                assert.strictEqual(data[0].UUID, "label14");
                assert.strictEqual(data[0].locked, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if all submissions are downvoted", (done) => {
        get("getLabelDownvote")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if all submissions are hidden", (done) => {
        get("getLabelHidden")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if all submissions are shadowhidden", (done) => {
        get("getLabelShadowHidden")
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
