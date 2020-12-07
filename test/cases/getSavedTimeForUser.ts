import request from 'request';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getSavedTimeForUser', () => {
    before(() => {
        let startOfQuery = "INSERT INTO sponsorTimes (videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID) VALUES";
        db.exec(startOfQuery + "('getSavedTimeForUser', 1, 11, 2, 'abc1239999', '" + getHash("testman") + "', 0, 50, 'sponsor', 0, '" + getHash('getSavedTimeForUser', 0) + "')");
    });

    it('Should be able to get a 200', (done: Done) => {
        request.get(getbaseURL()
            + "/api/getSavedTimeForUser?userID=testman", null,
            (err, res) => {
                if (err) done("couldn't call endpoint");
                else if (res.statusCode !== 200) done("non 200");
                else done(); // pass
            });
    });
});
