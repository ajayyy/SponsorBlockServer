import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('postClearCache', () => {
    beforeAll(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES ('` + getHash("clearing-vip") + "')");
        let startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES';
        await db.prepare("run", startOfQuery + "('clear-test', 0, 1, 2, 'clear-uuid', 'testman', 0, 50, 'sponsor', 0, '" + getHash('clear-test', 1) + "')");
    });

    it('Should be able to clear cache for existing video', async () => {
        const res = await fetch(getbaseURL()
            + "/api/clearCache?userID=clearing-vip&videoID=clear-test", {
            method: 'POST'
        })
        if (res.status !== 200) throw new Error("Status code was " + res.status);
    });

    it('Should be able to clear cache for nonexistent video', async () => {
        const res = await fetch(getbaseURL()
            + "/api/clearCache?userID=clearing-vip&videoID=dne-video", {
            method: 'POST'
        })
        if (res.status !== 200) throw new Error("Status code was " + res.status);
    });

    it('Should get 403 as non-vip', async () => {
        const res = await fetch(getbaseURL()
            + "/api/clearCache?userID=regular-user&videoID=clear-tes", {
            method: 'POST'
        })
        if (res.status !== 403) throw new Error('non 403 (' + res.status + ')');
    });

    it('Should give 400 with missing videoID', async () => {
        const res = await fetch(getbaseURL()
            + "/api/clearCache?userID=clearing-vip", {
            method: 'POST'
        })
        if (res.status !== 400) throw new Error('non 400 (' + res.status + ')');
    });

    it('Should give 400 with missing userID', async () => {
        const res = await fetch(getbaseURL()
            + "/api/clearCache?userID=clearing-vip", {
            method: 'POST'
        })
        if (res.status !== 400) throw new Error('non 400 (' + res.status + ')');
    });
});
