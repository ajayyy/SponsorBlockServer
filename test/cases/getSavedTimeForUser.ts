import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getSavedTimeForUser', () => {
    beforeAll(async () => {
        let startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES';
        await db.prepare("run", startOfQuery + "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ['getSavedTimeForUser', 1, 11, 2, 'abc1239999', getHash("testman"), 0, 50, 'sponsor', 0, getHash('getSavedTimeForUser', 0)]);
        return;
    });

    it('Should be able to get a 200', () =>
        fetch(getbaseURL() + "/api/getSavedTimeForUser?userID=testman")
        .then(res => {
            if (res.status !== 200) throw new Error("non 200");
        })
    );
});
