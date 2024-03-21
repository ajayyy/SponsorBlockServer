import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { User, genUsersProxy } from "../utils/genUser";
import { insertSegment, insertVip } from "../utils/queryGen";

const endpoint = "/api/clearCache";
const postClearCache = (user: User, videoID: string) => client({ method: "post", url: endpoint, params: { userID: user.privID, videoID } });

const users = genUsersProxy("postClearCache");

describe("postClearCache", () => {
    before(async () => {
        await insertVip(db, users["vip"].pubID);
        await insertSegment(db, { videoID: "clear-test" });
    });

    it("Should be able to clear cache for existing video", () =>
        postClearCache(users["vip"], "clear-test")
            .then(res => assert.strictEqual(res.status, 200))
    );

    it("Should be able to clear cache for nonexistent video", () =>
        postClearCache(users["vip"], "dne-video")
            .then(res => assert.strictEqual(res.status, 200))
    );

    it("Should get 403 as non-vip", () =>
        postClearCache(users["normal"], "clear-test")
            .then(res => assert.strictEqual(res.status, 403))
    );

    it("Should give 400 with missing videoID", () =>
        client.post(endpoint, { params: { userID: users["vip"].privID } })
            .then(res => assert.strictEqual(res.status, 400))
    );

    it("Should give 400 with missing userID", () =>
        client.post(endpoint, { params: { videoID: "clear-test" } })
            .then(res => assert.strictEqual(res.status, 400))
    );
});
