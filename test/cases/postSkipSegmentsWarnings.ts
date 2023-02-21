import { config } from "../../src/config";
import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";

describe("postSkipSegments Warnings", () => {
    // Constant and helpers
    const warnUser01 = "warn-user01-qwertyuiopasdfghjklzxcvbnm";
    const warnUser01Hash = getHash(warnUser01);
    const warnUser02 = "warn-user02-qwertyuiopasdfghjklzxcvbnm";
    const warnUser02Hash = getHash(warnUser02);
    const warnUser03 = "warn-user03-qwertyuiopasdfghjklzxcvbnm";
    const warnUser03Hash = getHash(warnUser03);

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
        const warningExpireTime = MILLISECONDS_IN_HOUR * config.hoursAfterWarningExpires;

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issuerUserID", "enabled", "reason", "issueTime") VALUES(?, ?, ?, ?, ?)';
        // User 1 - 4 active warnings
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, now]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, (now - 1000)]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, (now - 2000)]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, (now - 3601000)]);
        // User 2 - 3 active warnings
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 1, reason02, now]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 1, reason02, (now - (warningExpireTime + 1000))]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 1, reason02, (now - (warningExpireTime + 2000))]);
        // User 3 - 2 active warnings, 2 expired warnings
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 0, reason03, now]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 0, reason03, (now - 1000)]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 1, reason03, (now - 2000)]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 1, reason03, (now - 3601000)]);
    });

    it("Should be rejected with custom message if user has too many active warnings", (done) => {
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
                const expected = "Submission rejected due to a warning from a moderator. This means that we noticed you were making some common mistakes"
                + " that are not malicious, and we just want to clarify the rules. "
                + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
                + `Your userID is ${warnUser01Hash}.\n\nWarning reason: '${reason}'`;

                assert.strictEqual(errorMessage, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be accepted if user has some active warnings", (done) => {
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

    it("Should be accepted if user has some warnings removed", (done) => {
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

    it("Should be rejected with default message if user has to many active warnings", (done) => {
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
                assert.notStrictEqual(errorMessage, "");
                done();
            })
            .catch(err => done(err));
    });
});
