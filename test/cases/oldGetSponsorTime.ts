import fetch from 'node-fetch';
import {db} from '../../src/databases/databases';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';

describe('getVideoSponsorTime (Old get method)', () => {
    beforeAll(async () => {
        const insertSponsorTimes = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimes, ['old-testtesttest', 1, 11, 2, 'uuid-0', 'testman', 0, 50, 'sponsor', 0, getHash('old-testtesttest', 1)]);
        await db.prepare("run", insertSponsorTimes, ['old-testtesttest,test', 1, 11, 2, 'uuid-1', 'testman', 0, 50, 'sponsor', 0, getHash('old-testtesttest,test', 1)]);
    });

    it('Should be able to get a time', () =>
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest")
        .then(res => {
            if (res.status !== 200) throw new Error("non 200 (" + res.status + ")");
        })
    );

    it('Should return 404 if no segment found', () =>
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=notarealvideo")
        .then(res => {
            if (res.status !== 404) throw new Error("non 404 respone code: " + res.status);
        })
    );


    it('Should be possible to send unexpected query parameters', () =>
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest&fakeparam=hello")
        .then(res => {
            if (res.status !== 200) throw new Error("non 200");
        })
    );

    it('Should be able send a comma in a query param', async () => {
        const res = await fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest,test")
        const body = await res.text();
        if (res.status !== 200) throw new Error("non 200 response: " + res.status);
        else if (JSON.parse(body).UUIDs[0] !== 'uuid-1') throw new Error("couldn't parse response");
    });

    it('Should be able to get the correct time', async () => {
        const res = await fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest")
        if (res.status !== 200) throw new Error("non 200");
        else {
            const parsedBody = await res.json();
            if (parsedBody.sponsorTimes[0][0] !== 1
                || parsedBody.sponsorTimes[0][1] !== 11
                || parsedBody.UUIDs[0] !== 'uuid-0') {
                throw new Error("Wrong data was returned + " + JSON.stringify(parsedBody));
            }
        }
    });
});
