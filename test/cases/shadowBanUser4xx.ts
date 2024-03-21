import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { genUser } from "../utils/genUser";
import { insertVip } from "../utils/queryGen";

const endpoint = "/api/shadowBanUser";

const postShadowBan = (params: Record<string, string>) => client({
    method: "POST",
    url: endpoint,
    params
});

describe("shadowBanUser 4xx", () => {
    const vip = genUser("shadowBanUser", "4xx");

    before(async () => {
        await insertVip(db, vip.pubID);
    });

    it("Should return 400 if no adminUserID", () => {
        const userID = "shadowBanned";
        postShadowBan({ userID })
            .then(res => assert.strictEqual(res.status, 400));
    });

    it("Should return 400 if no userID", () => {
        postShadowBan({ adminUserID: vip.privID })
            .then(res => assert.strictEqual(res.status, 400));
    });

    it("Should return 403 if not authorized", () => {
        postShadowBan({ adminUserID: "notVIPUserID", userID: "shadowBanned" })
            .then(res => assert.strictEqual(res.status, 403));
    });
});
