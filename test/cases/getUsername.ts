import { getHash } from "../../src/utils/getHash";
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

const userOnePrivate = "getUsername_0";
const userOnePublic = getHash(userOnePrivate);
const userOneUsername = "getUsername_username";

describe("getUsername test", function() {
    it("Should get back publicUserID if not set", (done) => {
        getUsername(userOnePrivate)
            .then(result => {
                assert.strictEqual(result.data.userName, userOnePublic);
                done();
            })
            .catch(err => done(err));
    });
    it("Should be able to get username after setting", (done) => {
        postSetUserName(userOnePrivate, userOneUsername)
            .then(async () => {
                const result = await getUsername(userOnePrivate);
                const actual = result.data.userName;
                assert.strictEqual(actual, userOneUsername);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 if no userID provided", (done) => {
        client({
            url: "/api/getUsername"
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});