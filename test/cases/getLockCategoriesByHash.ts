import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { ActionType, VideoIDHash } from "../../src/types/segments.model";
import { genUser } from "../utils/genUser";
import { insertLock, insertVipUser } from "../utils/queryGen";

const fakeHash = "b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35" as VideoIDHash;
const endpoint = "/api/lockCategories";
const getLockCategories = (hash: string, actionType = [ActionType.Mute, ActionType.Skip]) => client.get(`${endpoint}/${hash}`, { params: { actionType } });

const verifyGetLockCategories = (hash: string, expected: Record<string, any>, actionType = [ActionType.Mute, ActionType.Skip]) =>
    getLockCategories(hash, actionType)
        .then(res => {
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.data, expected);
        });
const verifyGetLockCategoriesHashed = (videoID: string, expected: Record<string, any>, hashLength = 6, actionType = [ActionType.Mute, ActionType.Skip]) =>
    verifyGetLockCategories(getHash(videoID, 1).substring(0, hashLength), expected, actionType);

const vip = genUser("getLockCategoriesHash", "VIP");

describe("getLockCategoriesByHash", () => {
    before(async () => {
        await insertVipUser(db, vip);
        // add locks with real hash
        await insertLock(db, { userID: vip.pubID, videoID: "getLockHash1", category: "sponsor", reason: "1-reason-short" });
        await insertLock(db, { userID: vip.pubID, videoID: "getLockHash1", category: "interaction", reason: "1-reason-longer" });
        await insertLock(db, { userID: vip.pubID, videoID: "getLockHash2", category: "preview", reason: "2-reason" });
        await insertLock(db, { userID: vip.pubID, videoID: "getLockHash3", category: "nonmusic", reason: "3-reason" });
        // add locks with fake hash
        await insertLock(db, { userID: vip.pubID, videoID: "fakehash-1", actionType: "mute", category: "outro", reason: "fake1-reason", hashedVideoID: fakeHash });
        await insertLock(db, { userID: vip.pubID, videoID: "fakehash-2", actionType: "mute", category: "intro", reason: "fake2-longer-reason", hashedVideoID: fakeHash });
        await insertLock(db, { userID: vip.pubID, videoID: "fakehash-2", actionType: "mute", category: "preview", reason: "fake2-short", hashedVideoID: fakeHash });
        await insertLock(db, { userID: vip.pubID, videoID: "fakehash-2", actionType: "full", category: "sponsor", reason: "fake2-notshown", hashedVideoID: fakeHash });
    });

    it("Database should be greater or equal to version 29", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert(
            version >= 29,
            `Version isn't greater than 29. Version is ${version}`);
    });

    it("Should be able to get multiple locks in one object", () => {
        const videoID = "getLockHash1";
        const hash = getHash(videoID, 1);
        const expected = [{
            videoID,
            hash,
            categories: [
                "sponsor",
                "interaction"
            ],
            reason: "1-reason-longer"
        }];
        return verifyGetLockCategoriesHashed(videoID, expected, 4);
    });

    it("Should be able to get single lock", () => {
        const videoID = "getLockHash2";
        const hash = getHash(videoID, 1);
        const expected = [{
            videoID,
            hash,
            categories: [
                "preview"
            ],
            reason: "2-reason"
        }];
        return verifyGetLockCategoriesHashed(videoID, expected);
    });

    it("Should be able to get by half full hash", () => {
        const videoID = "getLockHash3";
        const hash = getHash(videoID, 1);
        const expected = [{
            videoID,
            hash,
            categories: [
                "nonmusic"
            ],
            reason: "3-reason"
        }];
        return verifyGetLockCategoriesHashed(videoID, expected, 32);
    });

    it("Should be able to get multiple by similar hash with multiple categories", () => {
        const expected = [{
            videoID: "fakehash-1",
            hash: fakeHash,
            categories: [
                "outro"
            ],
            reason: "fake1-reason",
        }, {
            videoID: "fakehash-2",
            hash: fakeHash,
            categories: [
                "intro",
                "preview"
            ],
            reason: "fake2-longer-reason",
        }];
        return verifyGetLockCategories(fakeHash.substring(0,5), expected);
    });

    it("should return 404 once hash prefix varies", () =>
        getLockCategories("b05aa")
            .then(res => assert.strictEqual(res.status, 404))
    );

    it("should return 404 if no lock exists", () =>
        getLockCategories("aaaaaa")
            .then(res => assert.strictEqual(res.status, 404))
    );

    it("should return 400 if full hash sent", () =>
        getLockCategories(fakeHash)
            .then(res => assert.strictEqual(res.status, 400))
    );

    it("should return 400 if hash too short", () =>
        getLockCategories("00")
            .then(res => assert.strictEqual(res.status, 400))
    );

    it("should return 400 if no hash specified", () =>
        getLockCategories("")
            .then(res => assert.strictEqual(res.status, 400))
    );

    it("should return 400 if invalid actionTypes", () =>
        client.get(`${endpoint}/aaaa`, { params: { actionTypes: 3 } })
            .then(res => assert.strictEqual(res.status, 400))
    );

    it("should return 400 if invalid actionTypes JSON", () =>
        client.get(`${endpoint}/aaaa`, { params: { actionTypes: "{3}" } })
            .then(res => assert.strictEqual(res.status, 400))
    );

    it("Should be able to get single lock", () => {
        const videoID = "getLockHash2";
        const hash = getHash(videoID, 1);
        const expected = [{
            videoID,
            hash,
            categories: [
                "preview"
            ],
            reason: "2-reason"
        }];
        return verifyGetLockCategoriesHashed(videoID, expected);
    });

    it("Should be able to get by actionType not in array", () => {
        const videoID = "getLockHash2";
        const hash = getHash(videoID, 1);
        const expected = [{
            videoID,
            hash,
            categories: [
                "preview"
            ],
            reason: "2-reason"
        }];
        return verifyGetLockCategories(hash.substring(0,6), expected, [ActionType.Skip]);
    });

    it("Should be able to get by no actionType", () => {
        const videoID = "getLockHash2";
        const hash = getHash(videoID, 1);
        const expected = [{
            videoID,
            hash,
            categories: [
                "preview"
            ],
            reason: "2-reason"
        }];
        return client.get(`${endpoint}/${hash.substring(0,6)}`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.deepStrictEqual(res.data, expected);
            });
    });
});
