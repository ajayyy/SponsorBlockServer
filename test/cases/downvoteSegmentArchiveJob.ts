import { strictEqual, ok } from "assert";
import { db } from "../../src/databases/databases";
import { archiveDownvoteSegment } from "../../src/cronjob/downvoteSegmentArchiveJob";
import { DBSegment } from "../../src/types/segments.model";
import { insertSegment, insertSegmentParams } from "../utils/segmentQueryGen";
import { multiGenProxy } from "../utils/genRandom";

const oct2021 = new Date("October 1, 2021").getTime();
const nov2021 = new Date("November 1, 2021").getTime();
const dec2021 = new Date("December 17, 2021").getTime();
const dec2022 = new Date("December 17, 2022").getTime();

const videoIDs = multiGenProxy("videoID", "downvoteSegmentArchiveJob");

const records: insertSegmentParams[] = [
    // video0
    { videoID: videoIDs[0], votes: 2, timeSubmitted: dec2021 },
    { videoID: videoIDs[0], votes: 2, timeSubmitted: dec2021 },
    { videoID: videoIDs[0], votes: 2, timeSubmitted: dec2021 },
    { videoID: videoIDs[0], votes: 2, timeSubmitted: dec2021 },
    { videoID: videoIDs[0], votes: 2, timeSubmitted: dec2021 },
    // video1
    { videoID: videoIDs[1], votes: 2, timeSubmitted: dec2021 },
    { videoID: videoIDs[1], votes: -3, timeSubmitted: dec2021 },
    // video2
    { videoID: videoIDs[2], votes: 2, timeSubmitted: dec2021 },
    { videoID: videoIDs[2], votes: -4, timeSubmitted: oct2021 },
    // video3
    { videoID: videoIDs[3], votes: 2, timeSubmitted: dec2021, locked: true },
    { videoID: videoIDs[3], votes: 100000, timeSubmitted: dec2021 },
    // video4
    { videoID: videoIDs[4], votes: 100000, timeSubmitted: dec2021, hidden: true },
    // video5
    { videoID: videoIDs[5], votes: 2, timeSubmitted: dec2021 },
    { videoID: videoIDs[5], votes: -1, timeSubmitted: dec2021 },
    { videoID: videoIDs[5], votes: -2, timeSubmitted: nov2021 },
    { videoID: videoIDs[5], votes: 2, timeSubmitted: dec2021 },
];

describe("downvoteSegmentArchiveJob", () => {
    beforeEach(async () => {
        for (const record of records) {
            await insertSegment(db, record);
        }
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        ok(version >= 21, "version should be greater or equal to 21");
    });

    afterEach(async () => {
        await db.prepare("run", 'DELETE FROM "sponsorTimes"');
        await db.prepare("run", 'DELETE FROM "archivedSponsorTimes"');
    });

    const getArchivedSegment = (): Promise<DBSegment[]> => db.prepare("all", 'SELECT * FROM "archivedSponsorTimes"');

    const getSegmentsInMainTable = (dayLimit: number, voteLimit: number, now: number): Promise<DBSegment[]> =>
        db.prepare(
            "all",
            'SELECT * FROM "sponsorTimes" WHERE "votes" < ? AND (? - "timeSubmitted") > ?',
            [
                voteLimit,
                now,
                dayLimit * 86400000,
            ]
        );

    const countSegmentInMainTable = (): Promise<number> =>
        db.prepare(
            "get",
            'SELECT COUNT(*) as count FROM "sponsorTimes"'
        ).then(res => res.count);

    it("Should archive all records match", async () => {
        const dayLimit = 20;
        const voteLimit = 0;
        const time = dec2022;
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        strictEqual(res, 0, "Expection in archiveDownvoteSegment");

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        strictEqual(archivedSegment.length, 4, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 4`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,"Incorrect segment remain in main table");
    });

    it("Should archive records with vote < -1 match", async () => {
        const dayLimit = 20;
        const voteLimit = -1;
        const time = dec2022;
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        strictEqual(res, 0, "");

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        strictEqual(archivedSegment.length, 3, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 3`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,"Incorrect segment remain in main table");
    });

    it("Should archive records with vote < -2 and day < 30 match", async () => {
        const dayLimit = 30;
        const voteLimit = -2;
        const time = dec2021;
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        strictEqual(res, 0, "");

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        strictEqual(archivedSegment.length, 1, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 1`);

        strictEqual(archivedSegment[0].votes, -4, `Incorrect segment vote in archiveTable: ${archivedSegment[0].votes} instead of -4`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,"Incorrect segment remain in main table");
    });

    it("Should archive records with vote < -2 and day < 300 match", async () => {
        const dayLimit = 300;
        const voteLimit = -2;
        const time = dec2022;
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        strictEqual(res, 0, "");

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        strictEqual(archivedSegment.length, 2, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 2`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,"Incorrect segment remain in main table");
    });

    it("Should not archive any", async () => {
        const dayLimit = 300;
        const voteLimit = -2;
        const time = dec2021;
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        strictEqual(res, 0, "");

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        strictEqual(archivedSegment.length, 0, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 0`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,"Incorrect segment remain in main table");
    });
});
