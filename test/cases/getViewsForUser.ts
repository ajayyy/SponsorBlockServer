import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
import assert from "assert";

// helpers
const endpoint = "/api/getViewsForUser";
const getViewsForUser = (userID: string) => client({
    url: endpoint,
    params: { userID }
});

const getViewUserOne = "getViewUser1";
const userOneViewsFirst = 30;
const userOneViewsSecond = 0;

const getViewUserTwo = "getViewUser2";
const userTwoViews = 0;

const getViewUserThree = "getViewUser3";


describe("getViewsForUser", function() {
    before(() => {
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "actionType", "videoDuration", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.prepare("run", insertSponsorTimeQuery, ["getViewUserVideo", 0, 1, 0, "getViewUserVideo0", getHash(getViewUserOne), 0, userOneViewsFirst, "sponsor", "skip", 0, 0, "getViewUserVideo"]);
        db.prepare("run", insertSponsorTimeQuery, ["getViewUserVideo", 0, 1, 0, "getViewUserVideo1", getHash(getViewUserOne), 0, userOneViewsSecond, "sponsor", "skip", 0, 0, "getViewUserVideo"]);
        db.prepare("run", insertSponsorTimeQuery, ["getViewUserVideo", 0, 1, 0, "getViewUserVideo2", getHash(getViewUserTwo), 0, userTwoViews, "sponsor", "skip", 0, 0, "getViewUserVideo"]);
    });
    it("Should get back views for user one", (done) => {
        getViewsForUser(getViewUserOne)
            .then(result => {
                assert.strictEqual(result.data.viewCount, userOneViewsFirst + userOneViewsSecond);
                done();
            })
            .catch(err => done(err));
    });
    it("Should get back views for user two", (done) => {
        getViewsForUser(getViewUserTwo)
            .then(result => {
                assert.strictEqual(result.data.viewCount, userTwoViews);
                done();
            })
            .catch(err => done(err));
    });
    it("Should get 404 if no submissions", (done) => {
        getViewsForUser(getViewUserThree)
            .then(result => {
                assert.strictEqual(result.status, 404);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 if no userID provided", (done) => {
        client({ url: endpoint })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});