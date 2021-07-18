import assert from 'assert';

import { db } from '../../src/databases/databases';
import { getHash } from '../../src/utils/getHash';
import { archiveDownvoteSegment } from '../../src/cronjob/downvoteSegmentArchiveJob';
import { DBSegment } from '../../src/types/segments.model';

const records = [
    ['testtesttest', 1, 11, 2, 0, '1-uuid-0', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 100, 0, 0, getHash('testtesttest', 1)],
    ['testtesttest2', 1, 11, 2, 0, '1-uuid-0-1', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 120, 0, 0, getHash('testtesttest2', 1)],
    ['testtesttest', 12, 14, 2, 0, '1-uuid-0-2', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'mute', 'ytb', 100, 0, 0, getHash('testtesttest', 1)],
    ['testtesttest', 20, 33, 2, 0, '1-uuid-2', 'testman', new Date('December 17, 2021').getTime(), 50, 'intro', 'skip', 'ytb', 101, 0, 0, getHash('testtesttest', 1)],
    ['testtesttest,test', 1, 11, 2, 0, '1-uuid-1', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 140, 0, 0, getHash('testtesttest,test', 1)],

    ['test3', 1, 11, 2, 0, '1-uuid-4', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 200, 0, 0, getHash('test3', 1)],
    ['test3', 7, 22, -3, 0, '1-uuid-5', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 300, 0, 0, getHash('test3', 1)],

    ['multiple', 1, 11, 2, 0, '1-uuid-6', 'testman', new Date('December 17, 2021').getTime(), 50, 'intro', 'skip', 'ytb', 400, 0, 0, getHash('multiple', 1)],
    ['multiple', 20, 33, -4, 0, '1-uuid-7', 'testman', new Date('October 1, 2021').getTime(), 50, 'intro', 'skip', 'ytb', 500, 0, 0, getHash('multiple', 1)],

    ['locked', 20, 33, 2, 1, '1-uuid-locked-8', 'testman', new Date('December 17, 2021').getTime(), 50, 'intro', 'skip', 'ytb', 230, 0, 0, getHash('locked', 1)],
    ['locked', 20, 34, 100000, 0, '1-uuid-9', 'testman', new Date('December 17, 2021').getTime(), 50, 'intro', 'skip', 'ytb', 190, 0, 0, getHash('locked', 1)],

    ['onlyHiddenSegments', 20, 34, 100000, 0, 'onlyHiddenSegments', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 190, 1, 0, getHash('onlyHiddenSegments', 1)],

    ['requiredSegmentVid-raw', 60, 70, 2, 0, 'requiredSegmentVid-raw-1', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)],
    ['requiredSegmentVid-raw', 60, 70, -1, 0, 'requiredSegmentVid-raw-2', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)],
    ['requiredSegmentVid-raw', 80, 90, -2, 0, 'requiredSegmentVid-raw-3', 'testman', new Date('November 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)],
    ['requiredSegmentVid-raw', 80, 90, 2, 0, 'requiredSegmentVid-raw-4', 'testman', new Date('December 17, 2021').getTime(), 50, 'sponsor', 'skip', 'ytb', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)]
];

describe('downvoteSegmentArchiveJob', () => {
    beforeEach(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", views, category, "actionType", "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        for (let i = 0; i < records.length; i += 1) {
            await db.prepare('run', query, records[i]);
        }

        return;
    });

    it('Should update the database version when starting the application', async () => {
        const version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        assert.ok(version >= 21, "version should be greater or equal to 21");
    });

    afterEach(async () => {
        await db.prepare('run', 'DELETE FROM "sponsorTimes"');
        await db.prepare('run', 'DELETE FROM "archivedSponsorTimes"');
    });

    const getArchivedSegment = (): Promise<DBSegment[]> => {
        return db.prepare('all', 'SELECT * FROM "archivedSponsorTimes"');
    };

    const getSegmentsInMainTable = (dayLimit: number, voteLimit: number, now: number): Promise<DBSegment[]> => {
        return db.prepare(
            'all', 
            'SELECT * FROM "sponsorTimes" WHERE "votes" < ? AND (? - "timeSubmitted") > ?',
            [
                voteLimit,
                now,
                dayLimit * 86400000,
            ]
        );
    };

    const countSegmentInMainTable = (): Promise<number> => {
        return db.prepare(
            'get', 
            'SELECT COUNT(*) as count FROM "sponsorTimes"'
        ).then(res => res.count);
    };

    it('Should archive all records match', async () => {
        const dayLimit = 20;
        const voteLimit = 0;
        const time = new Date('December 17, 2022').getTime();
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        assert.strictEqual(res, 0, 'Expection in archiveDownvoteSegment');

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        assert.strictEqual(archivedSegment.length, 4, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 4`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        assert.strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        assert.strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,'Incorrect segment remain in main table');
    });

    it('Should archive records with vote < -1 match', async () => {
        const dayLimit = 20;
        const voteLimit = -1;
        const time = new Date('December 17, 2022').getTime();
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        assert.strictEqual(res, 0, '');

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        assert.strictEqual(archivedSegment.length, 3, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 3`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        assert.strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        assert.strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,'Incorrect segment remain in main table');
    });

    it('Should archive records with vote < -2 and day < 30 match', async () => {
        const dayLimit = 30;
        const voteLimit = -2;
        const time = new Date('December 17, 2021').getTime();
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        assert.strictEqual(res, 0, '');

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        assert.strictEqual(archivedSegment.length, 1, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 1`);

        assert.strictEqual(archivedSegment[0].votes, -4, `Incorrect segment vote in archiveTable: ${archivedSegment[0].votes} instead of -4`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        assert.strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        assert.strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,'Incorrect segment remain in main table');
    });

    it('Should archive records with vote < -2 and day < 300 match', async () => {
        const dayLimit = 300;
        const voteLimit = -2;
        const time = new Date('December 17, 2022').getTime();
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        assert.strictEqual(res, 0, '');

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        assert.strictEqual(archivedSegment.length, 2, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 2`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        assert.strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        assert.strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,'Incorrect segment remain in main table');
    });

    it('Should not archive any', async () => {
        const dayLimit = 300;
        const voteLimit = -2;
        const time = new Date('December 17, 2021').getTime();
        const res = await archiveDownvoteSegment(dayLimit, voteLimit, time);
        assert.strictEqual(res, 0, '');

        // check segments in archived table
        const archivedSegment = await getArchivedSegment();
        assert.strictEqual(archivedSegment.length, 0, `Incorrect segment in archiveTable: ${archivedSegment.length} instead of 0`);

        // check segments not in main table
        const segments = await getSegmentsInMainTable(dayLimit, voteLimit, time);
        assert.strictEqual(segments.length, 0, `Incorrect segment in main table: ${segments.length} instead of 0`);

        // check number segments remain in main table
        assert.strictEqual(await countSegmentInMainTable(), records.length - archivedSegment.length ,'Incorrect segment remain in main table');
    });
});
