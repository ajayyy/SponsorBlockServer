import { genRandomValue } from "../utils/genRandom";
import { genAnonUser } from "../utils/genUser";
import { client } from "../utils/httpClient";
import assert from "assert";

// helpers
const getUsername = (userID: string) => client({
    url: "/api/getUsername",
    params: { userID }
});

const postSetUserName = (userID: string, username: string) => client({
    method: "POST",
    url: "/api/setUsername",
    params: {
        userID,
        username,
    }
});

describe("getUsername test", function() {
    it("Should get back publicUserID if not set", async () => {
        const user = genAnonUser();
        const result = await getUsername(user.privID);
        return assert.strictEqual(result.data.userName, user.pubID);
    });
    it("Should be able to get username after setting", () => {
        const user = genAnonUser();
        const username = genRandomValue("username", "getUsername");
        return postSetUserName(user.privID, username)
            .then(async () => {
                const result = await getUsername(user.privID);
                const actual = result.data.userName;
                assert.strictEqual(actual, username);
            });
    });
    it("Should return 400 if no userID provided", () => {
        client({ url: "/api/getUsername" })
            .then(res => assert.strictEqual(res.status, 400));
    });
});