import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

const endpoint = "/api/shadowBanUser";

const postShadowBan = (params: Record<string, string>) => client({
    method: "POST",
    url: endpoint,
    params
});

describe("shadowBanUser 4xx", () => {
    const VIPuserID = "shadow-ban-4xx-vip";

    before(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES(?)`, [getHash(VIPuserID)]);
    });

    it("Should return 400 if no adminUserID", (done) => {
        const userID = "shadowBanned";
        postShadowBan({ userID })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if no userID", (done) => {
        postShadowBan({ adminUserID: VIPuserID })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 403 if not authorized", (done) => {
        postShadowBan({ adminUserID: "notVIPUserID", userID: "shadowBanned" })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });
});
