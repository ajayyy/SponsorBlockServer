import assert from "assert";
import { client } from "../utils/httpClient";
import { db } from "../../src/databases/databases";
import { UserID } from "../../src/types/user.model";
import { Category, VideoID } from "../../src/types/segments.model";
import { insertVipUser } from "../utils/queryGen";
import { genUser } from "../utils/genUser";
import { genRandomValue } from "../utils/genRandom";

interface LockCategory {
    category: Category,
    reason: string,
    videoID: VideoID,
    userID: UserID
}
const endpoint = "/api/lockCategories";
const lockUser = genUser("lockCategoriesHttp", "vip");
const checkLockCategories = (videoID: string): Promise<LockCategory[]> => db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', [videoID]);

const goodResponse = (): any => ({
    videoID: "test-videoid",
    userID: "not-vip-test-userid",
    categories: ["sponsor"],
    actionTypes: ["skip"]
});

const errTest = (method = "POST", override: any): Promise<void> => {
    const data = { ...goodResponse(), ...override };
    return client(endpoint, { method, data })
        .then(res => assert.strictEqual(res.status, 400));
};

const statusTest = (method = "POST", data: any, status: number): Promise<void> =>
    client(endpoint, { method, data })
        .then(res => assert.strictEqual(res.status, status));

describe("POST lockCategories HTTP submitting", () => {
    before(async () => {
        await insertVipUser(db, lockUser);
    });

    it("should be able to add poi type category by type skip", () => {
        const videoID = genRandomValue("video","lockCategoriesHttp");
        const json = {
            videoID,
            userID: lockUser.privID,
            categories: ["poi_highlight"],
            actionTypes: ["skip"]
        };
        return statusTest("POST", json, 200)
            .then(() => checkLockCategories(videoID))
            .then(result => {
                assert.strictEqual(result.length, 1);
                assert.strictEqual(result[0].category, "poi_highlight");
            });
    });

    it("Should not add lock of invalid type", () => {
        const videoID = genRandomValue("video","lockCategoriesHttp");
        const json = {
            videoID,
            userID: lockUser.privID,
            categories: ["future_unused_invalid_type"],
            actionTypes: ["skip"]
        };
        return statusTest("POST", json, 200)
            .then(() => checkLockCategories(videoID))
            .then(result => assert.strictEqual(result.length, 0));
    });
});

describe("DELETE lockCategories 403/400 tests", () => {
    it("Should return 400 for no data", () => statusTest("DELETE", {}, 400));
    it("Should return 400 for no data", () => statusTest("POST", {}, 400));

    it("Should return 400 for no categories", () => {
        const json: any = {
            videoID: "test",
            userID: "test",
            categories: [],
        };
        return statusTest("DELETE", json, 400);
    });

    it("Should return 400 for no userID", () => {
        const json: any = {
            videoID: "test",
            userID: null,
            categories: ["sponsor"],
        };
        return statusTest("POST", json, 400);
    });

    it("Should return 400 for no videoID", () => {
        const json: any = {
            videoID: null,
            userID: "test",
            categories: ["sponsor"],
        };
        return statusTest("POST", json, 400);
    });

    it("Should return 400 for invalid category array", () => {
        const json = {
            videoID: "test",
            userID: "test",
            categories: {},
        };
        return statusTest("POST", json, 400);
    });
});

describe("manual DELETE/POST lockCategories 400 tests", () => {
    it("DELETE Should return 400 for no data", () => statusTest("DELETE", {}, 400));
    it("POST Should return 400 for no data", () => statusTest("POST", {}, 400));

    it("DELETE Should return 400 for bad format categories", () => errTest("DELETE", { categories: "sponsor" }));
    it("POST Should return 400 for bad format categories", () => errTest("POST", { categories: "sponsor" }));

    it("DELETE Should return 403 if user is not VIP", () => statusTest("DELETE", goodResponse(), 403));
    it("POST Should return 403 if user is not VIP", () => statusTest("POST", goodResponse(), 403));
});

describe("array of DELETE/POST lockCategories 400 tests", () => {
    for (const key of [ "videoID", "userID", "categories" ]) {
        for (const method of ["DELETE", "POST"]) {
            it(`${method} - Should return 400 for invalid ${key}`, () =>
                errTest(method, { [key]: null })
            );
        }
    }
});