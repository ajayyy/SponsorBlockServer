import fetch from "node-fetch";
import {db} from "../../src/databases/databases";
import { Done } from "../utils/utils";
import { getbaseURL } from "../utils/getBaseURL";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import assert from "assert";

const endpoint = `${getbaseURL()}/api/getVideoSponsorTimes`;

describe("getVideoSponsorTime (Old get method)", () => {
    before(async () => {
        const insertSponsorTimes = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimes, ["oldGetSponsorTime0",      1, 11, 2, "oldGetSponsorTime00", "oldGetSponsorTimeUser", 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimes, ["oldGetSponsorTime1,test", 1, 11, 2, "oldGetSponsorTime01", "oldGetSponsorTimeUser", 0, 50, "sponsor", 0]);
    });

    it("Should be able to get a time", (done: Done) => {
        fetch(`${endpoint}?videoID=oldGetSponsorTime0`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if no segment found", (done: Done) => {
        fetch(`${endpoint}?videoID=notarealvideo`)
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });


    it("Should be possible to send unexpected query parameters", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=oldGetSponsorTime0&fakeparam=hello`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(() => done("couldn't callendpoint"));
    });

    it("Should be able send a comma in a query param", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=oldGetSponsorTime1,test`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    UUIDs: ["oldGetSponsorTime01"],
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get the correct time", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=oldGetSponsorTime0`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    sponsorTimes: [[1, 11]],
                    UUIDs: ["oldGetSponsorTime00"]
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });
});
