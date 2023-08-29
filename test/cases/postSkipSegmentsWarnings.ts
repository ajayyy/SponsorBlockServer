import { config } from "../../src/config";
import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";

describe("postSkipSegments Warnings", () => {
    // Constant and helpers
    const warnUser01 = "warn-user01";
    const warnUser01Hash = getHash(warnUser01);
    const warnUser02 = "warn-user02";
    const warnUser02Hash = getHash(warnUser02);
    const warnUser03 = "warn-user03";
    const warnUser03Hash = getHash(warnUser03);
    const warnUser04 = "warn-user04";
    const warnUser04Hash = getHash(warnUser04);

    const warnVideoID = "postSkipSegments-warn-video";

    const endpoint = "/api/skipSegments";
    const postSkipSegmentJSON = (data: Record<string, any>) => client({
        method: "POST",
        url: endpoint,
        data
    });

    before(() => {
        const now = Date.now();

        const warnVip01Hash = getHash("postSkipSegmentsWarnVIP");

        const reason01 = "Reason01";
        const reason02 = "";
        const reason03 = "Reason03";

        const MILLISECONDS_IN_HOUR = 3600000;
        const WARNING_EXPIRATION_TIME = config.hoursAfterWarningExpires * MILLISECONDS_IN_HOUR;

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issuerUserID", "enabled", "reason", "issueTime") VALUES(?, ?, ?, ?, ?)';
        // User 1 | 1 active | custom reason
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, now]);
        // User 2 | 1 inactive | default reason
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 0, reason02, now]);
        // User 3 | 1 expired, active | custom reason
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 1, reason03, (now - WARNING_EXPIRATION_TIME - 1000)]);
        // User 4 | 1 active | default reason
        db.prepare("run", insertWarningQuery, [warnUser04Hash, warnVip01Hash, 1, reason02, now]);
    });

    it("Should be rejected with custom message if user has active warnings", (done) => {
        postSkipSegmentJSON({
            userID: warnUser01,
            videoID: warnVideoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                const errorMessage = res.data;
                const reason = "Reason01";
                const expected = "Submission rejected due to a tip from a moderator. This means that we noticed you were making some common mistakes"
                + " that are not malicious, and we just want to clarify the rules. "
                + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
                + `Your userID is ${warnUser01Hash}.\n\nWarning reason: '${reason}'`;

                assert.strictEqual(errorMessage, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be accepted if user has inactive warning", (done) => {
        postSkipSegmentJSON({
            userID: warnUser02,
            videoID: warnVideoID,
            segments: [{
                segment: [50, 60],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.ok(res.status === 200, `Status code was ${res.status} ${res.data}`);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be accepted if user has expired warning", (done) => {
        postSkipSegmentJSON({
            userID: warnUser03,
            videoID: warnVideoID,
            segments: [{
                segment: [53, 60],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.ok(res.status === 200, `Status code was ${res.status} ${res.data}`);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected with default message if user has active warning", (done) => {
        postSkipSegmentJSON({
            userID: warnUser04,
            videoID: warnVideoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                const errorMessage = res.data;
                const expected = "Submission rejected due to a tip from a moderator. This means that we noticed you were making some common mistakes"
                + " that are not malicious, and we just want to clarify the rules. "
                + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
                + `Your userID is ${warnUser04Hash}.`;
                assert.strictEqual(errorMessage, expected);
                done();
            })
            .catch(err => done(err));
    });
});
