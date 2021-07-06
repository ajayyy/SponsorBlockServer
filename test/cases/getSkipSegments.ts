import fetch from 'node-fetch';
import {db} from '../../src/databases/databases';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';

describe('getSkipSegments', () => {
    before(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", views, category, "actionType", "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", query, ['testtesttest', 1, 11, 2, 0, '1-uuid-0', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 100, 0, 0, getHash('testtesttest', 1)]);
        await db.prepare("run", query, ['testtesttest2', 1, 11, 2, 0, '1-uuid-0-1', 'testman', 0, 50, 'sponsor', 'skip', 'PeerTube', 120, 0, 0, getHash('testtesttest2', 1)]);
        await db.prepare("run", query, ['testtesttest', 12, 14, 2, 0, '1-uuid-0-2', 'testman', 0, 50, 'sponsor', 'mute', 'YouTube', 100, 0, 0, getHash('testtesttest', 1)]);
        await db.prepare("run", query, ['testtesttest', 20, 33, 2, 0, '1-uuid-2', 'testman', 0, 50, 'intro', 'skip', 'YouTube', 101, 0, 0, getHash('testtesttest', 1)]);
        await db.prepare("run", query, ['testtesttest,test', 1, 11, 2, 0, '1-uuid-1', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 140, 0, 0, getHash('testtesttest,test', 1)]);
        await db.prepare("run", query, ['test3', 1, 11, 2, 0, '1-uuid-4', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 200, 0, 0, getHash('test3', 1)]);
        await db.prepare("run", query, ['test3', 7, 22, -3, 0, '1-uuid-5', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 300, 0, 0, getHash('test3', 1)]);
        await db.prepare("run", query, ['multiple', 1, 11, 2, 0, '1-uuid-6', 'testman', 0, 50, 'intro', 'skip', 'YouTube', 400, 0, 0, getHash('multiple', 1)]);
        await db.prepare("run", query, ['multiple', 20, 33, 2, 0, '1-uuid-7', 'testman', 0, 50, 'intro', 'skip', 'YouTube', 500, 0, 0, getHash('multiple', 1)]);
        await db.prepare("run", query, ['locked', 20, 33, 2, 1, '1-uuid-locked-8', 'testman', 0, 50, 'intro', 'skip', 'YouTube', 230, 0, 0, getHash('locked', 1)]);
        await db.prepare("run", query, ['locked', 20, 34, 100000, 0, '1-uuid-9', 'testman', 0, 50, 'intro', 'skip', 'YouTube', 190, 0, 0, getHash('locked', 1)]);
        await db.prepare("run", query, ['onlyHiddenSegments', 20, 34, 100000, 0, 'onlyHiddenSegments', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 190, 1, 0, getHash('onlyHiddenSegments', 1)]);
        await db.prepare("run", query, ['requiredSegmentVid-raw', 60, 70, 2, 0, 'requiredSegmentVid-raw-1', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)]);
        await db.prepare("run", query, ['requiredSegmentVid-raw', 60, 70, -2, 0, 'requiredSegmentVid-raw-2', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)]);
        await db.prepare("run", query, ['requiredSegmentVid-raw', 80, 90, -2, 0, 'requiredSegmentVid-raw-3', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)]);
        await db.prepare("run", query, ['requiredSegmentVid-raw', 80, 90, 2, 0, 'requiredSegmentVid-raw-4', 'testman', 0, 50, 'sponsor', 'skip', 'YouTube', 0, 0, 0, getHash('requiredSegmentVid-raw', 1)]);
        return;
    });


    it('Should be able to get a time by category 1', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=sponsor")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0" && data[0].videoDuration === 100) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => "Couldn't call endpoint");
    });

    it('Should be able to get a time by category and action type', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=sponsor&actionType=mute")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 12 && data[0].segment[1] === 14
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0-2" && data[0].videoDuration === 100) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => "Couldn't call endpoint");
    });

    it('Should be able to get a time by category and multiple action types', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=sponsor&actionType=mute&actionType=skip")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 2 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0" 
                    && data[1].UUID === "1-uuid-0-2" && data[0].videoDuration === 100) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => "Couldn't call endpoint");
    });

    it('Should be able to get a time by category and multiple action types (JSON array)', (done: Done) => {
        fetch(getbaseURL() + '/api/skipSegments?videoID=testtesttest&category=sponsor&actionTypes=["mute","skip"]')
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 2 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0" 
                    && data[1].UUID === "1-uuid-0-2" && data[0].videoDuration === 100) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => "Couldn't call endpoint");
    });

    it('Should be able to get a time by category for a different service 1', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest2&category=sponsor&service=PeerTube")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0-1" && data[0].videoDuration === 120) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => "Couldn't call endpoint");
    });

    it('Should be able to get a time by category 2', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=intro")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 20 && data[0].segment[1] === 33
                    && data[0].category === "intro" && data[0].UUID === "1-uuid-2") {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should be able to get a time by categories array', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"sponsor\"]")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0" && data[0].videoDuration === 100) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should be able to get a time by categories array 2', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"intro\"]")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 20 && data[0].segment[1] === 33
                    && data[0].category === "intro" && data[0].UUID === "1-uuid-2" && data[0].videoDuration === 101) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should return 404 if all submissions are hidden', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=onlyHiddenSegments")
        .then(res => {
            if (res.status !== 404) done("non 404 respone code: " + res.status);
            else done(); // pass
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should be able to get multiple times by category', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=multiple&categories=[\"intro\"]")
        .then(async res => {
            if (res.status !== 200)done("Status code was: " + res.status);
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

                    if (success) done();
                    else done("Received incorrect body: " + body);
                } else {
                    done("Received incorrect body: " + body);
                }
            }
        })
        .catch(err => ("Couldn't call endpoint\n\n" + err));
    });

    it('Should be able to get multiple times by multiple categories', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"sponsor\", \"intro\"]")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
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

                    if (success) done();
                    else done("Received incorrect body: " + body);
                } else {
                    done("Received incorrect body: " + body);
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should be possible to send unexpected query parameters', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&fakeparam=hello&category=sponsor")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const body = await res.text();
                const data = JSON.parse(body);
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0") {
                    done();
                } else {
                    done("Received incorrect body: " + body);
                }
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Low voted submissions should be hidden', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=test3&category=sponsor")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const body = await res.text();
                const data = JSON.parse(body);
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-4") {
                    done();
                } else {
                    done("Received incorrect body: " + body);
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should return 404 if no segment found', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=notarealvideo")
        .then(res => {
            if (res.status !== 404) done("non 404 respone code: " + res.status);
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('Should return 400 if bad categories argument', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[not-quoted,not-quoted]")
        .then(res => {
            if (res.status !== 400) done("non 400 respone code: " + res.status);
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('Should be able send a comma in a query param', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest,test&category=sponsor")
        .then(async res => {
            if (res.status !== 200) done ("Status code was: " + res.status);
            else {
                const body = await res.text();
                const data = JSON.parse(body);
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-1") {
                    done();
                } else {
                    done("Received incorrect body: " + body);
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should always get locked segment', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=locked&category=intro")
        .then(async res => {
            if (res.status !== 200) done ("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 20 && data[0].segment[1] === 33
                    && data[0].category === "intro" && data[0].UUID === "1-uuid-locked-8") {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should be able to get multiple categories with repeating parameters', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&category=sponsor&category=intro")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
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

                    if (success) done();
                    else done("Received incorrect body: " + body);
                } else {
                    done("Received incorrect body: " + body);
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should be able to get, categories param overriding repeating category', (done: Done) => {
        fetch(getbaseURL() + "/api/skipSegments?videoID=testtesttest&categories=[\"sponsor\"]&category=intro")
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].segment[0] === 1 && data[0].segment[1] === 11
                    && data[0].category === "sponsor" && data[0].UUID === "1-uuid-0") {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(() => ("Couldn't call endpoint"));
    });

    it('Should be able to get specific segments with requiredSegments', (done: Done) => {
        fetch(getbaseURL() + '/api/skipSegments?videoID=requiredSegmentVid-raw&requiredSegments=["requiredSegmentVid-raw-2","requiredSegmentVid-raw-3"]')
        .then(async res => {
            if (res.status !== 200) done("non 200 status code, was " + res.status);
            else {
                const body = await res.json();
                if (body.length !== 2) done("expected 2 segments, got " + body.length);
                else if (body[0].UUID !== 'requiredSegmentVid-raw-2' 
                        || body[1].UUID !== 'requiredSegmentVid-raw-3') done("Did not recieve the correct segments\n" + JSON.stringify(body, null, 2));
                else done();
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be able to get specific segments with repeating requiredSegment', (done: Done) => {
        fetch(getbaseURL() + '/api/skipSegments?videoID=requiredSegmentVid-raw&requiredSegment=requiredSegmentVid-raw-2&requiredSegment=requiredSegmentVid-raw-3')
        .then(async res => {
            if (res.status !== 200) done("non 200 status code, was " + res.status);
            else {
                const body = await res.json();
                if (body.length !== 2) done("expected 2 segments, got " + body.length);
                else if (body[0].UUID !== 'requiredSegmentVid-raw-2' 
                        || body[1].UUID !== 'requiredSegmentVid-raw-3') done("Did not recieve the correct segments\n" + JSON.stringify(body, null, 2));
                else done();
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });
});
