import assert from "assert";
import { db } from "../../src/databases/databases";
import { Postgres } from "../../src/databases/Postgres";
import { client } from "../utils/httpClient";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { insertChapter } from "../utils/segmentQueryGen";
import { genRandomValue } from "../utils/getRandom";
import { insertVideoInfo } from "../utils/queryGen";

describe("getChapterNames", function () {
    const endpoint = "/api/chapterNames";

    const chapterNamesVid1 = genRandomValue("video", "getChapterNames");
    const chapterChannelID = genRandomValue("channel", "getChapterNames");
    const chapterNames = [
        "Weird name",
        "A different one",
        "Something else",
    ];

    const nameSearch = (query: string, expected: string): Promise<void> => {
        const expectedData = [{
            description: expected
        }];
        return client.get(`${endpoint}?description=${query}&channelID=${chapterChannelID}`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.length, 1);
                assert.ok(partialDeepEquals(res.data, expectedData));
            });
    };

    before(async function() {
        if (!(db instanceof Postgres)) this.skip(); // only works with Postgres
        await insertChapter(db, chapterNames[0], { videoID: chapterNamesVid1, startTime: 60, endTime: 80 });
        await insertChapter(db, chapterNames[1], { videoID: chapterNamesVid1, startTime: 70, endTime: 75 });
        await insertChapter(db, chapterNames[2], { videoID: chapterNamesVid1, startTime: 71, endTime: 76 });

        await insertVideoInfo(db, chapterNamesVid1, chapterChannelID);
    });

    it("Search for 'weird'", () => nameSearch("weird", chapterNames[0]));
    it("Search for 'different'", () => nameSearch("different", chapterNames[1]));
    it("Search for 'something'", () => nameSearch("something", chapterNames[2]));
});