import { db } from "../../src/databases/databases";
import { genUsersProxy, User } from "../utils/genUser";
import { client } from "../utils/httpClient";
import assert from "assert";
import { insertVip } from "../utils/queryGen";

const endpoint = "/api/isUserVIP";
const vipUserRequest = (userID: string) => client.get(endpoint, { params: { userID } });
const checkVipStatus = (user: User, expected: boolean) =>
    vipUserRequest(user.privID)
        .then(res => {
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.vip, expected);
        });

const users = genUsersProxy("getIsUserVIP");

describe("getIsUserVIP", () => {
    before(async () => {
        await insertVip(db, users["vip"].pubID);
    });

    // status checks
    it("Should be able to get a 200", () =>
        vipUserRequest(users["vip"].privID)
            .then(res => assert.strictEqual(res.status, 200))
    );


    it("Should get a 400 if no userID", () =>
        client.get(endpoint)
            .then(res => assert.strictEqual(res.status, 400, "response should be 400"))
    );

    // user checks
    it("Should say a VIP is a VIP", () => checkVipStatus(users["vip"], true));
    it("Should say a normal user is not a VIP", () => checkVipStatus(users["normal"], false));
});
