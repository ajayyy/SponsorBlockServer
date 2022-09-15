import assert from "assert";
import { db } from "../../src/databases/databases";
import { Postgres } from "../../src/databases/Postgres";
import { client } from "../utils/httpClient";
import { partialDeepEquals } from "../utils/partialDeepEquals";

// Only works with Postgres
if (db instanceof Postgres) {

    describe("getChapterNames", function () {
        const endpoint = "/api/chapterNames";

        const chapterNamesVid1 = "chapterNamesVid";
        const chapterChannelID = "chapterChannelID";

        before(async () => {
            const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "hidden", "shadowHidden", "description") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            await db.prepare("run", query, [chapterNamesVid1, 60, 80, 2, 0, "chapterNamesVid-1", "testman", 0, 50, "chapter", "chapter", "YouTube", 0, 0, 0, "Weird name"]);
            await db.prepare("run", query, [chapterNamesVid1, 70, 75, 2, 0, "chapterNamesVid-2", "testman", 0, 50, "chapter", "chapter", "YouTube", 0, 0, 0, "A different one"]);
            await db.prepare("run", query, [chapterNamesVid1, 71, 76, 2, 0, "chapterNamesVid-3", "testman", 0, 50, "chapter", "chapter", "YouTube", 0, 0, 0, "Something else"]);

            await db.prepare("run", `INSERT INTO "videoInfo" ("videoID", "channelID", "title", "published") 
                SELECT ?, ?, ?, ?`, [
                chapterNamesVid1, chapterChannelID, "", 0
            ]);
        });

        it("Search for 'weird'", async () => {
            const result = await client.get(`${endpoint}?description=weird&channelID=${chapterChannelID}`);
            const expected = [{
                description: "Weird name",
            }];

            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.length, 3);
            assert.ok(partialDeepEquals(result.data, expected));
        });

        it("Search for 'different'", async () => {
            const result = await client.get(`${endpoint}?description=different&channelID=${chapterChannelID}`);
            const expected = [{
                description: "A different one",
            }];

            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.length, 3);
            assert.ok(partialDeepEquals(result.data, expected));
        });

        it("Search for 'something'", async () => {
            const result = await client.get(`${endpoint}?description=something&channelID=${chapterChannelID}`);
            const expected = [{
                description: "Something else",
            }];

            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.length, 3);
            assert.ok(partialDeepEquals(result.data, expected));
        });
    });
}