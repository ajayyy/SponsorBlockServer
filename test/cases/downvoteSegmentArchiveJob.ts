import { strictEqual, ok } from "assert";
import { db } from "../../src/databases/databases";
import { archiveDownvoteSegment } from "../../src/cronjob/downvoteSegmentArchiveJob";
import { DBSegment } from "../../src/types/segments.model";

const oct2021 = new Date("October 1, 2021").getTime();
const nov2021 = new Date("November 1, 2021").getTime();
const dec2021 = new Date("December 17, 2021").getTime();
const dec2022 = new Date("December 17, 2022").getTime();

const records = [
    ["dsajVideo0", 0, 0, 2, 0, "dsaj00", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo0", 0, 0, 2, 0, "dsaj01", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo0", 0, 0, 2, 0, "dsaj02", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo0", 0, 0, 2, 0, "dsaj03", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo0", 0, 0, 2, 0, "dsaj04", "dsajUser", dec2021, 0, 0, 0,],

    ["dsajVideo1", 0, 0, 2, 0, "dsaj10", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo1", 0, 0, -3, 0, "dsaj11", "dsajUser", dec2021, 0, 0, 0],

    ["dsajVideo2", 0, 0, 2, 0, "dsaj20", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo2", 0, 0, -4, 0, "dsaj21", "dsajUser", oct2021, 0, 0, 0],

    ["dsajVideo3", 0, 0, 2, 1, "dsaj30", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo3", 0, 0, 100000, 0, "dsaj31", "dsajUser", dec2021, 0, 0, 0],

    ["dsajVideo4", 0, 0, 100000, 0, "dsaj40", "dsajUser", dec2021, 0, 1, 0],

    ["dsajVideo5", 0, 0, 2, 0, "dsaj50", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo5", 0, 0, -1, 0, "dsaj51", "dsajUser", dec2021, 0, 0, 0],
    ["dsajVideo5", 0, 0, -2, 0, "dsaj52", "dsajUser", nov2021, 0, 0, 0],
    ["dsajVideo5", 0, 0, 2, 0, "dsaj53", "dsajUser", dec2021, 0, 0, 0]
];

describe("downvoteSegmentArchiveJob", () => {
    beforeEach(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "hidden", "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        for (const record of records) {
            await db.prepare("run", query, record);
        }

        return;
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
