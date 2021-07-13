import fetch from 'node-fetch';
import {db} from '../../src/databases/databases';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import assert from 'assert';

describe('getVideoSponsorTime (Old get method)', () => {
    before(async () => {
        const insertSponsorTimes = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimes, ['old-testtesttest', 1, 11, 2, 'uuid-0', 'testman', 0, 50, 'sponsor', 0, getHash('old-testtesttest', 1)]);
        await db.prepare("run", insertSponsorTimes, ['old-testtesttest,test', 1, 11, 2, 'uuid-1', 'testman', 0, 50, 'sponsor', 0, getHash('old-testtesttest,test', 1)]);
    });

    it('Should be able to get a time', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest")
        .then(res => {
            assert.strictEqual(res.status, 200);
            done();
        })
        .catch(err => done(err));
    });

    it('Should return 404 if no segment found', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=notarealvideo")
        .then(res => {
            assert.strictEqual(res.status, 404);
            done();
        })
        .catch(err => done(err));
    });


    it('Should be possible to send unexpected query parameters', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest&fakeparam=hello")
        .then(res => {
            assert.strictEqual(res.status, 200);
            done();
        })
        .catch(() => done("couldn't callendpoint"));
    });

    it('Should be able send a comma in a query param', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest,test")
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.UUIDs[0], "uuid-1");
            done();
        })
        .catch(err => done(err));
    });

    it('Should be able to get the correct time', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest")
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.sponsorTimes[0][0], 1);
            assert.strictEqual(data.sponsorTimes[0][1], 11);
            assert.strictEqual(data.UUIDs[0], 'uuid-0');
            done();
        })
        .catch(err => done(err));
    });
});
