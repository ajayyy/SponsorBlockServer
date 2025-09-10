import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
import assert from "assert";
import { genUsers, User } from "../utils/genUser";
import { insertSegment } from "../utils/segmentQueryGen";

// helpers
const endpoint = "/api/getViewsForUser";
const getViewsForUser = (userID: string) => client({
    url: endpoint,
    params: { userID }
});

const cases = [
    "u-1",
    "u-2",
    "u-3"
];
const users = genUsers("getViewUser", cases);

// set views for users
users["u-1"].info["views1"] = 30;
users["u-1"].info["views2"] = 0;
users["u-1"].info["views"] = users["u-1"].info.views1 + users["u-1"].info.views2;
users["u-2"].info["views"] = 0;
users["u-3"].info["views"] = 0;

const checkUserViews = (user: User) =>
    getViewsForUser(user.privID)
        .then(result => {
            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.viewCount, user.info.views);
        });

describe("getViewsForUser", function() {
    before(async () => {
        // add views for users
        await insertSegment(db, { userID: users["u-1"].pubID, views: users["u-1"].info.views1 });
        await insertSegment(db, { userID: users["u-1"].pubID, views: users["u-1"].info.views2 });
        await insertSegment(db, { userID: users["u-2"].pubID, views: users["u-2"].info.views });
    });
    it("Should get back views for user one", () =>
        checkUserViews(users["u-1"])
    );
    it("Should get back views for user two", () =>
        checkUserViews(users["u-2"])
    );
    it("Should get 404 if no submissions", () =>
        getViewsForUser(users["u-3"].pubID)
            .then(result => assert.strictEqual(result.status, 404))
    );
    it("Should return 400 if no userID provided", () =>
        client({ url: endpoint })
            .then(res => assert.strictEqual(res.status, 400))
    );
});
