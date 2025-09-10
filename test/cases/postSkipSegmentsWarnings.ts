import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { usersForSuite } from "../utils/randomUsers";

describe("postSkipSegments Warnings", () => {
    // Constant and helpers
    const users = usersForSuite("postSkipSegmentsWarnings");
    const warnVideoID = "postSkipSegments-warn-video";

    const endpoint = "/api/skipSegments";
    const postSkipSegmentJSON = (data: Record<string, any>) => client({
        method: "POST",
        url: endpoint,
        data
    });

    before(async () => {
        const now = Date.now();

        const reason01 = "Reason01";
        const reason02 = "";
        const reason03 = "Reason03";

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issuerUserID", "enabled", "reason", "issueTime") VALUES(?, ?, ?, ?, ?)';
        // User 1 | 1 active | custom reason
        await db.prepare("run", insertWarningQuery, [users.u01.public, users.vip01.public, 1, reason01, now]);
        // User 2 | 1 inactive | default reason
        await db.prepare("run", insertWarningQuery, [users.u02.public, users.vip01.public, 0, reason02, now]);
        // User 3 | 1 inactive, 1 active | different reasons
        await db.prepare("run", insertWarningQuery, [users.u03.public, users.vip01.public, 0, reason01, now]);
        await db.prepare("run", insertWarningQuery, [users.u03.public, users.vip01.public, 1, reason03, now+1]);
        // User 4 | 1 active | default reason
        await db.prepare("run", insertWarningQuery, [users.u04.public, users.vip01.public, 1, reason02, now]);
    });

    it("Should be rejected with custom message if user has active warnings", async () => {
        const res = await postSkipSegmentJSON({
            userID: users.u01.private,
            videoID: warnVideoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        });
        assert.strictEqual(res.status, 403);
        const errorMessage = res.data;
        const reason = "Reason01";
        const expected = "Submission rejected due to a tip from a moderator. This means that we noticed you were making some common mistakes"
        + " that are not malicious, and we just want to clarify the rules. "
        + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
        + `Your userID is ${users.u01.public}.\n\nTip message: '${reason}'`;

        assert.strictEqual(errorMessage, expected);
    });

    it("Should be accepted if user has inactive warning", async () => {
        const res = await postSkipSegmentJSON({
            userID: users.u02.private,
            videoID: warnVideoID,
            segments: [{
                segment: [50, 60],
                category: "sponsor",
            }],
        });
        assert.ok(res.status === 200, `Status code was ${res.status} ${res.data}`);
    });

    it("Should be rejected with custom message if user has active warnings, even if has one inactive warning, should use current message", async () => {
        const res = await postSkipSegmentJSON({
            userID: users.u03.private,
            videoID: warnVideoID,
            segments: [{
                segment: [10, 20],
                category: "sponsor",
            }],
        });
        assert.strictEqual(res.status, 403);
        const errorMessage = res.data;
        const reason = "Reason03";
        const expected = "Submission rejected due to a tip from a moderator. This means that we noticed you were making some common mistakes"
        + " that are not malicious, and we just want to clarify the rules. "
        + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
        + `Your userID is ${users.u03.public}.\n\nTip message: '${reason}'`;

        assert.strictEqual(errorMessage, expected);
    });

    it("Should be rejected with default message if user has active warning", async () => {
        const res = await postSkipSegmentJSON({
            userID: users.u04.private,
            videoID: warnVideoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        });
        assert.strictEqual(res.status, 403);
        const errorMessage = res.data;
        const expected = "Submission rejected due to a tip from a moderator. This means that we noticed you were making some common mistakes"
        + " that are not malicious, and we just want to clarify the rules. "
        + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
        + `Your userID is ${users.u04.public}.`;
        assert.strictEqual(errorMessage, expected);
    });
});
