import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { insertLock } from "../utils/queryGen";
import { multiGenRandomValue } from "../utils/genRandom";

const endpoint = "/api/lockCategories";
const defaultActionTypes = ["skip", "mute"];

const getLockCategories = (videoID: string, actionType = defaultActionTypes, service = "YouTube") => client.get(endpoint, { params: { videoID, actionType, service } });
const queryStatusCheck = (status: number, queryString: string) =>
    client.get(`${endpoint}${queryString}`)
        .then(res => assert.strictEqual(res.status, status));

type lockResponse = {
    categories?: string[],
    reason?: string,
    actionTypes?: string[]
}
type lockOverrides = {
    actionTypes?: string[],
    service?: string
}
const validateResponse = (videoID: string, overrides: lockOverrides = {}, expected: lockResponse): Promise<void> => {
    const actionTypes = overrides.actionTypes ?? defaultActionTypes;
    const service = overrides.service ?? "YouTube";
    const defaultExpected = { categories: [ "sponsor" ], reason: "", actionTypes: defaultActionTypes };
    const expectedResponse = { ...defaultExpected, ...expected };
    return getLockCategories(videoID, actionTypes, service)
        .then(res => {
            assert.strictEqual(res.status, 200);
            // modify both categories to sort()
            res.data.categories?.sort();
            expectedResponse.categories?.sort();
            assert.deepStrictEqual(res.data, expectedResponse);
        });
};

const validate404 = (videoID: string, overrides: lockOverrides = {}): Promise<void> => {
    const actionTypes = overrides.actionTypes || defaultActionTypes;
    const service = overrides.service || "YouTube";
    return getLockCategories(videoID, actionTypes, service)
        .then(res => assert.strictEqual(res.status, 404));
};

const videoIDs = multiGenRandomValue("video", "getLockCategories", 3);

describe("getLockCategories", () => {
    before(async () => {
        await insertLock(db, { videoID: videoIDs[0], reason: "1-short" });
        await insertLock(db, { videoID: videoIDs[0], reason: "1-longer-reason", actionType: "mute", category: "interaction" });

        await insertLock(db, { videoID: videoIDs[1], reason: "2-reason", category: "preview" });

        await insertLock(db, { videoID: videoIDs[2], reason: "3-reason", category: "nonmusic", actionType: "mute", service: "PeerTube" });
        await insertLock(db, { videoID: videoIDs[2], reason: "3-reason" });
        await insertLock(db, { videoID: videoIDs[2], reason: "3-longer-reason", category: "selfpromo", actionType: "full" });
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert.ok(version >= 29, `Version isn't greater than 29. Version is ${version}`);
    });

    // 200 tests
    it("should return 200 by single actionType", () => queryStatusCheck(200, `?videoID=${videoIDs[0]}&actionType=mute`));
    it("should return 200 by single actionTypes JSON", () => queryStatusCheck(200, `?videoID=${videoIDs[0]}&actionTypes=["mute"]`));
    it("should return 200 by repeating actionTypes", () => queryStatusCheck(200, `?videoID=${videoIDs[0]}&actionType=mute&actionType=skip`) );

    // 404 tests
    it("should return 404 if no lock exists", () => validate404("getLockCategoryNull"));
    it("should return 404 if invalid actionTypes specified", () => validate404(videoIDs[0], { actionTypes: ["ban"] }));

    // 400 tests
    it("should return 400 if no videoID specified", () => queryStatusCheck(400, ""));

    // complicated response tests
    it("Should be able to get multiple locks", () =>
        validateResponse(videoIDs[0], {}, {
            categories: [
                "sponsor",
                "interaction"
            ],
            reason: "1-longer-reason"
        })
    );

    it("Should be able to get single locks", () =>
        validateResponse(videoIDs[1], {}, {
            categories: [
                "preview"
            ],
            reason: "2-reason",
        })
    );

    it("Should be able to get multiple locks with service", () =>
        validateResponse(videoIDs[0], {}, {
            categories: [
                "sponsor",
                "interaction"
            ],
            reason: "1-longer-reason",
        })
    );

    it("Should be able to get single locks with service", () =>
        validateResponse(videoIDs[2], { service: "PeerTube" }, {
            categories: [ "nonmusic" ],
            reason: "3-reason",
        })
    );

    it("Should be able to get single locks with service", () =>
        validateResponse(videoIDs[2], { service: "Youtube" }, {
            reason: "3-reason",
        })
    );

    it("should return result from Youtube service if service not match", () =>
        validateResponse(videoIDs[2], { service: "Dailymotion" }, {
            reason: "3-reason",
        })
    );

    it("should be able to get with specific actionType", () =>
        validateResponse(videoIDs[0], { actionTypes: ["mute"] }, {
            categories: [
                "interaction"
            ],
            reason: "1-longer-reason",
            actionTypes: ["mute"]
        })
    );

    it("Should be able to get skip, mute, full", () => {
        const actionTypes = [...defaultActionTypes, "full"];
        return validateResponse(videoIDs[2], { actionTypes }, {
            categories: [
                "sponsor",
                "selfpromo",
                // "nonmusic", // no nonmusic since it's on other service
            ],
            reason: "3-longer-reason",
            actionTypes
        });
    });
});
