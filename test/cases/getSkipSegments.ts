import fetch from 'node-fetch';
import {db} from '../../src/databases/databases';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';

describe('getSkipSegments', () => {
    beforeAll(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", views, category, "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", query, ['testtesttest', 1, 11, 2, 0, '1-uuid-0', 'testman', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, getHash('testtesttest', 1)]);
        await db.prepare("run", query, ['testtesttest2', 1, 11, 2, 0, '1-uuid-0-1', 'testman', 0, 50, 'sponsor', 'PeerTube', 120, 0, 0, getHash('testtesttest2', 1)]);
        await db.prepare("run", query, ['testtesttest', 20, 33, 2, 0, '1-uuid-2', 'testman', 0, 50, 'intro', 'YouTube', 101, 0, 0, getHash('testtesttest', 1)]);
        await db.prepare("run", query, ['testtesttest,test', 1, 11, 2, 0, '1-uuid-1', 'testman', 0, 50, 'sponsor', 'YouTube', 140, 0, 0, getHash('testtesttest,test', 1)]);
        await db.prepare("run", query, ['test3', 1, 11, 2, 0, '1-uuid-4', 'testman', 0, 50, 'sponsor', 'YouTube', 200, 0, 0, getHash('test3', 1)]);
        await db.prepare("run", query, ['test3', 7, 22, -3, 0, '1-uuid-5', 'testman', 0, 50, 'sponsor', 'YouTube', 300, 0, 0, getHash('test3', 1)]);
        await db.prepare("run", query, ['multiple', 1, 11, 2, 0, '1-uuid-6', 'testman', 0, 50, 'intro', 'YouTube', 400, 0, 0, getHash('multiple', 1)]);
        await db.prepare("run", query, ['multiple', 20, 33, 2, 0, '1-uuid-7', 'testman', 0, 50, 'intro', 'YouTube', 500, 0, 0, getHash('multiple', 1)]);
        await db.prepare("run", query, ['locked', 20, 33, 2, 1, '1-uuid-locked-8', 'testman', 0, 50, 'intro', 'YouTube', 230, 0, 0, getHash('locked', 1)]);
        await db.prepare("run", query, ['locked', 20, 34, 100000, 0, '1-uuid-9', 'testman', 0, 50, 'intro', 'YouTube', 190, 0, 0, getHash('locked', 1)]);
        await db.prepare("run", query, ['onlyHiddenSegments', 20, 34, 100000, 0, 'onlyHiddenSegments', 'testman', 0, 50, 'sponsor', 'YouTube', 190, 1, 0, getHash('onlyHiddenSegments', 1)]);
        return;
    });


    it('Should be able to get a time by category 1', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=sponsor")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].segment[0] !== 1 || data[0].segment[1] !== 11
                || data[0].category !== "sponsor" || data[0].UUID !== "1-uuid-0" || data[0].videoDuration !== 100) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to get a time by category for a different service 1', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest2&category=sponsor&service=PeerTube")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].segment[0] !== 1 || data[0].segment[1] !== 11
                || data[0].category !== "sponsor" || data[0].UUID !== "1-uuid-0-1" || data[0].videoDuration !== 120) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to get a time by category 2', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=intro")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].segment[0] !== 20 || data[0].segment[1] !== 33
                || data[0].category !== "intro" || data[0].UUID !== "1-uuid-2") {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to get a time by categories array', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"sponsor\"]")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].segment[0] !== 1 || data[0].segment[1] !== 11
                || data[0].category !== "sponsor" || data[0].UUID !== "1-uuid-0" || data[0].videoDuration !== 100) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to get a time by categories array 2', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"intro\"]")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].segment[0] !== 20 || data[0].segment[1] !== 33
                || data[0].category !== "intro" || data[0].UUID !== "1-uuid-2" || data[0].videoDuration !== 101) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should return 404 if all submissions are hidden', () =>
        fetch(getbaseURL() + "/api/skipSegments?videoID=onlyHiddenSegments")
        .then(res => {
            if (res.status !== 404) throw new Error("non 404 respone code: " + res.status);
        })
    );

    it('Should be able to get multiple times by category', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=multiple&categories=[\"intro\"]")
        if (res.status !== 200)throw new Error("Status code was: " + res.status);
        else {
            const body = await res.text();
            const data = JSON.parse(body);
            if (data.length === 2) {
                let success = true;
                for (const segment of data) {
                    if ((segment.segment[0] !== 20 || segment.segment[1] !== 33
                        || segment.category !== "intro" || segment.UUID !== "1-uuid-7") &&
                        (segment.segment[0] !== 1 || segment.segment[1] !== 11
                            || segment.category !== "intro" || segment.UUID !== "1-uuid-6")) {
                        success = false;
                        break;
                    }
                }

                if (!success) throw new Error("Received incorrect body: " + body);
            } else {
                throw new Error("Received incorrect body: " + body);
            }
        }
    });

    it('Should be able to get multiple times by multiple categories', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"sponsor\", \"intro\"]")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const body = await res.text();
            const data = JSON.parse(body);
            if (data.length === 2) {

                let success = true;
                for (const segment of data) {
                    if ((segment.segment[0] !== 20 || segment.segment[1] !== 33
                        || segment.category !== "intro" || segment.UUID !== "1-uuid-2") &&
                        (segment.segment[0] !== 1 || segment.segment[1] !== 11
                            || segment.category !== "sponsor" || segment.UUID !== "1-uuid-0")) {
                        success = false;
                        break;
                    }
                }

                if (!success) throw new Error("Received incorrect body: " + body);
            } else {
                throw new Error("Received incorrect body: " + body);
            }
        }
    });

    it('Should be possible to send unexpected query parameters', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&fakeparam=hello&category=sponsor")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const body = await res.text();
            const data = JSON.parse(body);
            if (data.length !== 1 || data[0].segment[0] !== 1 || data[0].segment[1] !== 11
                || data[0].category !== "sponsor" || data[0].UUID !== "1-uuid-0") {
                throw new Error("Received incorrect body: " + body);
            }
        }
    });

    it('Low voted submissions should be hidden', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=test3&category=sponsor")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const body = await res.text();
            const data = JSON.parse(body);
            if (data.length !== 1 || data[0].segment[0] !== 1 || data[0].segment[1] !== 11
                || data[0].category !== "sponsor" || data[0].UUID !== "1-uuid-4") {
                throw new Error("Received incorrect body: " + body);
            }
        }
    });

    it('Should return 404 if no segment found', () =>
        fetch(getbaseURL() + "/api/skipSegments?videoID=notarealvideo")
        .then(res => {
            if (res.status !== 404) throw new Error("non 404 respone code: " + res.status);
        })
    );

    it('Should return 400 if bad categories argument', () =>
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[not-quoted,not-quoted]")
        .then(res => {
            if (res.status !== 400) throw new Error("non 400 respone code: " + res.status);
        })
    );

    it('Should be able send a comma in a query param', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest,test&category=sponsor")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const body = await res.text();
            const data = JSON.parse(body);
            if (data.length !== 1 || data[0].segment[0] !== 1 || data[0].segment[1] !== 11
                || data[0].category !== "sponsor" || data[0].UUID !== "1-uuid-1") {
                throw new Error("Received incorrect body: " + body);
            }
        }
    });

    it('Should always get locked segment', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=locked&category=intro")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].segment[0] !== 20 || data[0].segment[1] !== 33
                || data[0].category !== "intro" || data[0].UUID !== "1-uuid-locked-8") {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to get multiple categories with repeating parameters', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=sponsor&category=intro")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const body = await res.text();
            const data = JSON.parse(body);
            if (data.length === 2) {

                let success = true;
                for (const segment of data) {
                    if ((segment.segment[0] !== 20 || segment.segment[1] !== 33
                        || segment.category !== "intro" || segment.UUID !== "1-uuid-2") &&
                        (segment.segment[0] !== 1 || segment.segment[1] !== 11
                            || segment.category !== "sponsor" || segment.UUID !== "1-uuid-0")) {
                        success = false;
                        break;
                    }
                }

                if (success) throw new Error();
                else throw new Error("Received incorrect body: " + body);
            } else {
                throw new Error("Received incorrect body: " + body);
            }
        }
    });

    it('Should be able to get, categories param overriding repeating category', async () => {
        const res = await fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"sponsor\"]&category=intro")
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].segment[0] !== 1 || data[0].segment[1] !== 11
                || data[0].category !== "sponsor" || data[0].UUID !== "1-uuid-0") {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });
});
