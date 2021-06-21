import fetch from 'node-fetch';
import {db} from '../../src/databases/databases';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';

describe('getVideoSponsorTime (Old get method)', () => {
    before(async () => {
        const insertSponsorTimes = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimes, ['old-testtesttest', 1, 11, 2, 'uuid-0', 'testman', 0, 50, 'sponsor', 0, getHash('old-testtesttest', 1)]);
        await db.prepare("run", insertSponsorTimes, ['old-testtesttest,test', 1, 11, 2, 'uuid-1', 'testman', 0, 50, 'sponsor', 0, getHash('old-testtesttest,test', 1)]);
    });

    it('Should be able to get a time', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest")
        .then(res => {
            if (res.status !== 200) done("non 200 (" + res.status + ")");
            else done(); // pass
        })
        .catch(err => done("Couldn't call endpoint"));
    });

    it('Should return 404 if no segment found', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=notarealvideo")
        .then(res => {
            if (res.status !== 404) done("non 404 respone code: " + res.status);
            else done(); // pass
        })
        .catch(err => done("couldn't call endpoint"));
    });


    it('Should be possible to send unexpected query parameters', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest&fakeparam=hello")
        .then(res => {
            if (res.status !== 200) done("non 200");
            else done(); // pass
        })
        .catch(err => done("couldn't callendpoint"));
    });

    it('Should be able send a comma in a query param', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest,test")
        .then(async res => {
            const body = await res.text();
            if (res.status !== 200) done("non 200 response: " + res.status);
            else if (JSON.parse(body).UUIDs[0] === 'uuid-1') done(); // pass
            else done("couldn't parse response");
        })
        .catch(err => done("couln't call endpoint"));
    });

    it('Should be able to get the correct time', (done: Done) => {
        fetch(getbaseURL() + "/api/getVideoSponsorTimes?videoID=old-testtesttest")
        .then(async res => {
            if (res.status !== 200) done("non 200");
            else {
                const parsedBody = await res.json();
                if (parsedBody.sponsorTimes[0][0] === 1
                    && parsedBody.sponsorTimes[0][1] === 11
                    && parsedBody.UUIDs[0] === 'uuid-0') {
                    done(); // pass
                } else {
                    done("Wrong data was returned + " + JSON.stringify(parsedBody));
                }
            }

        })
        .catch(err => done("couldn't call endpoint"));
    });
});
