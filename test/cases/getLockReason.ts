import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { UsernameUser, genUserUsername, emptyUsernameUser } from "../utils/genUser";
import { deleteUsername, insertLock, insertUsernameUser, insertVipUser } from "../utils/queryGen";
import { genRandomValue } from "../utils/genRandom";
import { AxiosResponse } from "axios";

const endpoint = "/api/lockReason";

const vipUser1 = genUserUsername("getLockReason", "vip1", "username-vip1");
const vipUser2 = genUserUsername("getLockReason", "vip2", "username-vip2");

const videoID = genRandomValue("video", "getLockReason");

async function validateLocks(
    query: Record<string, string | string[]>,
    expected: { category: string, locked?: boolean, reason: string, user: UsernameUser }[]) {
    const res = await client.get(endpoint, { params: { videoID, ...query } });
    validateBody(res, expected);
}

function validateBody(res: AxiosResponse,
    expected: { category: string, locked?: boolean, reason: string, user: UsernameUser }[]) {
    const expectedArray = expected.map(({ category, locked, reason, user }) => ({
        category,
        locked: Number(locked ?? true),
        reason,
        userID: user.pubID,
        userName: user.username
    }));
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.data, expectedArray);
}

describe("getLockReason", () => {
    before(async () => {
        // add VIP users
        await insertVipUser(db, vipUser1);
        await insertVipUser(db, vipUser2);
        // add usernames
        await insertUsernameUser(db, vipUser1);
        await insertUsernameUser(db, vipUser2);
        // user 1
        await insertLock(db, { videoID, userID: vipUser1.pubID, category: "sponsor", reason: "sponsor-reason" });
        await insertLock(db, { videoID, userID: vipUser1.pubID, category: "interaction", reason: "interaction-reason" });
        await insertLock(db, { videoID, userID: vipUser1.pubID, category: "preview", reason: "preview-reason" });
        await insertLock(db, { videoID, userID: vipUser1.pubID, category: "music_offtopic", reason: "nonmusic-reason", actionType: "mute" });
        // user 2
        await insertLock(db, { videoID, userID: vipUser2.pubID, category: "outro", reason: "outro-reason", actionType: "mute" });
        await insertLock(db, { videoID, userID: vipUser2.pubID, category: "selfpromo", reason: "selfpromo-reason", actionType: "full" });
    });

    after(async () => {
        await deleteUsername(db, vipUser1.pubID);
        await deleteUsername(db, vipUser2.pubID,);
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        if (version > 20) return;
        else return `Version isn't greater than 20. Version is ${version}`;
    });

    it("Should be able to get single reason", () =>
        validateLocks(
            { category: "sponsor" },
            [{ category: "sponsor", reason: "sponsor-reason", user: vipUser1 }])
    );

    it("Should be able to get with actionTypes array", () =>
        validateLocks(
            { category: "selfpromo", actionTypes: '["full"]' },
            [{ category: "selfpromo", reason: "selfpromo-reason", user: vipUser2 }])
    );

    it("Should be able to get with actionType", () =>
        validateLocks(
            { category: "selfpromo", actionType: "full" },
            [{ category: "selfpromo", reason: "selfpromo-reason", user: vipUser2 }])
    );

    it("Should be able to get with actionType array", () =>
        validateLocks(
            { category: "selfpromo", actionType: ["full"] },
            [{ category: "selfpromo", reason: "selfpromo-reason", user: vipUser2 }])
    );

    it("Should be able to get empty locks", () =>
        validateLocks(
            { category: "intro" },
            [{ category: "intro", locked: false, reason: "", user: emptyUsernameUser }]
        )
    );

    it("should get multiple locks with array", () =>
        validateLocks(
            { categories: '["intro","sponsor","outro"]' },
            [
                { category: "intro", locked: false, reason: "", user: emptyUsernameUser },
                { category: "sponsor", reason: "sponsor-reason", user: vipUser1 },
                { category: "outro",reason: "outro-reason", user: vipUser2 }
            ]
        )
    );

    it("should get multiple locks with repeated category", async () => {
        const categoryString = ["interaction", "music_offtopic", "intro"].join("&category=");
        const queryUrl = `${endpoint}?videoID=${videoID}&category=${categoryString}`;
        const categoryRes = await client.get(queryUrl);
        const expected = [
            { category: "interaction", reason: "interaction-reason", user: vipUser1 },
            { category: "music_offtopic", reason: "nonmusic-reason", user: vipUser1 },
            { category: "intro", locked: false, reason: "", user: emptyUsernameUser }
        ];
        validateBody(categoryRes, expected);
    });
});

describe("getLockReason 400", () => {
    it("Should return 400 with missing videoID", async () => {
        const res = await client.get(endpoint);
        assert.strictEqual(res.status, 400);
    });

    it("Should return 400 with invalid actionTypes ", async () => {
        const res = await client.get(endpoint, { params: { videoID: "valid-videoid", actionTypes: 3 } });
        assert.strictEqual(res.status, 400);
    });

    it("Should return 400 with invalid actionTypes JSON ", async () => {
        const res = await client.get(endpoint, { params: { videoID: "valid-videoid", actionTypes: "{3}" } });
        assert.strictEqual(res.status, 400);
    });

    it("Should return 400 with invalid categories", async () => {
        const res = await client.get(endpoint, { params: { videoID: "valid-videoid", categories: 3 } });
        assert.strictEqual(res.status, 400);
    });

    it("Should return 400 with invalid categories JSON", async () => {
        const res = await client.get(endpoint, { params: { videoID: "valid-videoid", categories: "{3}" } });
        assert.strictEqual(res.status, 400);
    });
});
