import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';


describe('postVideoSponsorTime (Old submission method)', () => {
    it('Should be able to submit a time (GET)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcQ&startTime=1&endTime=10&userID=test")
        if (res.status === 200) {
            let row = await db.prepare('get', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcQ"]);
            if (row.startTime !== 1 || row.endTime !== 10 || row.category !== "sponsor") {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit a time (POST)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcE&startTime=1&endTime=11&userID=test", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
        })
        if (res.status === 200) {
            let row = await db.prepare('get', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcE"]);
            if (row.startTime !== 1 || row.endTime !== 11 || row.category !== "sponsor") {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should return 400 for missing params', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?startTime=1&endTime=10&userID=test")
            if (res.status !== 400) throw new Error("Status code was: " + res.status);
    });
});
