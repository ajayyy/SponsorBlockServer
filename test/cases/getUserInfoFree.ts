import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { genAnonUser } from "../utils/genUser";
import { insertSegment } from "../utils/segmentQueryGen";
import { insertVip } from "../utils/queryGen";

describe("getUserInfo Free Chapters", () => {
    const endpoint = "/api/userInfo";
    const postOldQualify = 1600000000000;

    const getUserInfo = (userID: string) => client.get(endpoint, { params: { userID, value: "freeChaptersAccess" } });
    const assertChapterAccess = (pubID: string) =>
        getUserInfo(pubID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.freeChaptersAccess, true);
            });

    it("Should get free access under new rule (newQualify)", async () => {
        const user = genAnonUser();
        await insertSegment(db, { userID: user.pubID, timeSubmitted: postOldQualify });
        return assertChapterAccess(user.pubID);
    });

    it("Should get free access (VIP)", async () => {
        const user = genAnonUser();
        await insertVip(db, user.pubID);
        return assertChapterAccess(user.pubID);
    });

    it("Should get free access (rep)", async () => {
        const user = genAnonUser();
        await insertSegment(db, { userID: user.pubID, reputation: 20 });
        return assertChapterAccess(user.pubID);
    });

    it("Should get free access (old)", async () => {
        const user = genAnonUser();
        await insertSegment(db, { userID: user.pubID, timeSubmitted: 0 });
        return assertChapterAccess(user.pubID);
    });

    it("Everyone should get free access", async() => {
        const user = genAnonUser();
        return assertChapterAccess(user.pubID);
    });
});
