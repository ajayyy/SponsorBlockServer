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
        "Weirder name",
    ];

    const nameSearch = (query: string, expected: string | null, expectedResults: number): Promise<void> => {
        const expectedData = [{
            description: expected
        }];
        return client.get(`${endpoint}?description=${query}&channelID=${chapterChannelID}`)
            .then(res => {
                assert.strictEqual(res.status, expectedResults == 0 ? 404 : 200);
                assert.strictEqual(res.data.length, expectedResults);
                if (expected != null) assert.ok(partialDeepEquals(res.data, expectedData));
            });
    };

    before(async function() {
        if (!(db instanceof Postgres)) this.skip(); // only works with Postgres
        await insertChapter(db, chapterNames[0], { videoID: chapterNamesVid1, startTime: 60, endTime: 80 });
        await insertChapter(db, chapterNames[1], { videoID: chapterNamesVid1, startTime: 70, endTime: 75 });
        await insertChapter(db, chapterNames[2], { videoID: chapterNamesVid1, startTime: 71, endTime: 76 });
        await insertChapter(db, chapterNames[3], { videoID: chapterNamesVid1, startTime: 72, endTime: 77 });

        await insertVideoInfo(db, chapterNamesVid1, chapterChannelID);
    });

    it("Search for 'weird' (2 results)", () => nameSearch("weird", chapterNames[0], 2));
    it("Search for 'different' (1 result)", () => nameSearch("different", chapterNames[1], 1));
    it("Search for 'something' (1 result)", () => nameSearch("something", chapterNames[2], 1));
    it("Search for 'unrelated' (0 result)", () => nameSearch("unrelated", null, 0));
});
