import fetch from 'node-fetch';
import {db} from '../../src/databases/databases';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';

const ENOENTID =        "0000000000000000000000000000000000000000000000000000000000000000"
const upvotedID =       "a000000000000000000000000000000000000000000000000000000000000000"
const downvotedID =     "b000000000000000000000000000000000000000000000000000000000000000"
const lockedupID =      "c000000000000000000000000000000000000000000000000000000000000000"
const infvotesID =      "d000000000000000000000000000000000000000000000000000000000000000"
const shadowhiddenID =  "e000000000000000000000000000000000000000000000000000000000000000"
const lockeddownID =    "f000000000000000000000000000000000000000000000000000000000000000"
const hiddenID =        "1000000000000000000000000000000000000000000000000000000000000000"
const fillerID1 =       "1100000000000000000000000000000000000000000000000000000000000000"
const fillerID2 =       "1200000000000000000000000000000000000000000000000000000000000000"
const fillerID3 =       "1300000000000000000000000000000000000000000000000000000000000000"
const fillerID4 =       "1400000000000000000000000000000000000000000000000000000000000000"
const fillerID5 =       "1500000000000000000000000000000000000000000000000000000000000000"
const oldID =           "a0000000-0000-0000-0000-000000000000"

describe('getSegmentInfo', () => {
    before(async () => {
        let insertQuery = `INSERT INTO 
            "sponsorTimes"("videoID", "startTime", "endTime", "votes", "locked",
            "UUID", "userID", "timeSubmitted", "views", "category", "service",
            "videoDuration", "hidden", "shadowHidden", "hashedVideoID") 
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.prepare("run", insertQuery, ['upvoted', 1, 10, 2, 0, upvotedID, 'testman', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, getHash('upvoted', 1)]);
        await db.prepare("run", insertQuery, ['downvoted', 1, 10, -2, 0, downvotedID, 'testman', 0, 50, 'sponsor', 'YouTube', 120, 0, 0, getHash('downvoted', 1)]);
        await db.prepare("run", insertQuery, ['locked-up', 1, 10, 2, 1, lockedupID, 'testman', 0, 50, 'sponsor', 'YouTube', 101, 0, 0, getHash('locked-up', 1)]);
        await db.prepare("run", insertQuery, ['infvotes', 1, 10, 100000, 0, infvotesID, 'testman', 0, 50, 'sponsor', 'YouTube', 101, 0, 0, getHash('infvotes', 1)]);
        await db.prepare("run", insertQuery, ['hidden', 1, 10, 2, 0, hiddenID, 'testman', 0, 50, 'sponsor', 'YouTube', 140, 1, 0, getHash('hidden', 1)]);
        await db.prepare("run", insertQuery, ['shadowhidden', 1, 10, 2, 0, shadowhiddenID, 'testman', 0, 50, 'sponsor', 'YouTube', 140, 0, 1, getHash('shadowhidden', 1)]);
        await db.prepare("run", insertQuery, ['locked-down', 1, 10, -2, 1, lockeddownID, 'testman', 0, 50, 'sponsor', 'YouTube', 200, 0, 0, getHash('locked-down', 1)]);
        await db.prepare("run", insertQuery, ['oldID', 1, 10, 1, 0, oldID, 'testman', 0, 50, 'sponsor', 'YouTube', 300, 0, 0, getHash('oldID', 1)]);
        await db.prepare("run", insertQuery, ['filler', 1, 2, 1, 0, fillerID1, 'testman', 0, 50, 'sponsor', 'YouTube', 300, 0, 0, getHash('filler', 1)]);
        await db.prepare("run", insertQuery, ['filler', 2, 3, 1, 0, fillerID2, 'testman', 0, 50, 'sponsor', 'YouTube', 300, 0, 0, getHash('filler', 1)]);
        await db.prepare("run", insertQuery, ['filler', 3, 4, 1, 0, fillerID3, 'testman', 0, 50, 'sponsor', 'YouTube', 300, 0, 0, getHash('filler', 1)]);
        await db.prepare("run", insertQuery, ['filler', 4, 5, 1, 0, fillerID4, 'testman', 0, 50, 'sponsor', 'YouTube', 300, 0, 0, getHash('filler', 1)]);
        await db.prepare("run", insertQuery, ['filler', 5, 6, 1, 0, fillerID5, 'testman', 0, 50, 'sponsor', 'YouTube', 300, 0, 0, getHash('filler', 1)]);
    });

    it('Should be able to retreive upvoted segment', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${upvotedID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "upvoted" && data[0].votes === 2) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive downvoted segment', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${downvotedID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "downvoted" && data[0].votes === -2) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive locked up segment', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${lockedupID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "locked-up" && data[0].locked === 1 && data[0].votes === 2) {
                    done();
                } else {
                    done ("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive infinite vote segment', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${infvotesID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "infvotes" && data[0].votes === 100000) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive shadowhidden segment', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${shadowhiddenID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "shadowhidden" && data[0].shadowHidden === 1) {
                    done();
                } else {
                    done ("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive locked down segment', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${lockeddownID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "locked-down" && data[0].votes === -2 && data[0].locked === 1) {
                    done();
                } else {
                    done ("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive hidden segment', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${hiddenID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "hidden" && data[0].hidden === 1) {
                    done();
                } else {
                    done ("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive segment with old ID', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${oldID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "oldID" && data[0].votes === 1) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive single segment in array', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}"]`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].videoID === "upvoted" && data[0].votes === 2) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be able to retreive multiple segments in array', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}", "${downvotedID}"]`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 2 &&
                    (data[0].videoID === "upvoted" && data[0].votes === 2) &&
                    (data[1].videoID === "downvoted" && data[1].votes === -2)) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should be possible to send unexpected query parameters', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${upvotedID}&fakeparam=hello&category=sponsor`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data[0].videoID === "upvoted" && data[0].votes === 2) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should return 400 if array passed to UUID', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=["${upvotedID}", "${downvotedID}"]`)
        .then(res => {
            if (res.status !== 400) done("non 400 respone code: " + res.status);
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should return 400 if bad array passed to UUIDs', (done: Done) => {
        fetch(getbaseURL() + "/api/segmentInfo?UUIDs=[not-quoted,not-quoted]")
        .then(res => {
            if (res.status !== 400) done("non 404 respone code: " + res.status);
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should return 400 if bad UUID passed', (done: Done) => {
        fetch(getbaseURL() + "/api/segmentInfo?UUID=notarealuuid")
        .then(res => {
            if (res.status !== 400) done("non 400 respone code: " + res.status);
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should return 400 if bad UUIDs passed in array', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["notarealuuid", "anotherfakeuuid"]`)
        .then(res => {
            if (res.status !== 400) done("non 400 respone code: " + res.status);
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should return good UUID when mixed with bad UUIDs', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}", "anotherfakeuuid"]`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 && data[0].videoID === "upvoted" && data[0].votes === 2) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should cut off array at 10', function(done: Done) {
        this.timeout(10000);
        const filledIDArray = `["${upvotedID}", "${downvotedID}", "${lockedupID}", "${shadowhiddenID}", "${lockeddownID}", "${hiddenID}", "${fillerID1}", "${fillerID2}", "${fillerID3}", "${fillerID4}", "${fillerID5}"]`;
        fetch(getbaseURL() + `/api/segmentInfo?UUIDs=${filledIDArray}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                // last segment should be fillerID4
                if (data.length === 10 && data[0].videoID === "upvoted" && data[0].votes === 2 && data[9].videoID === "filler" && data[9].UUID === fillerID4) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should not duplicate reponses', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${downvotedID}"]`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 2 && data[0].videoID === "upvoted" && data[0].votes === 2 && data[1].videoID === "downvoted" && data[1].votes === -2) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should return 400 if UUID not found', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${ENOENTID}`)
        .then(res => {
            if (res.status !== 400) done("non 400 respone code: " + res.status);
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should be able to retreive multiple segments with multiple parameters', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${upvotedID}&UUID=${downvotedID}`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 2 &&
                    (data[0].videoID === "upvoted" && data[0].votes === 2) &&
                    (data[1].videoID === "downvoted" && data[1].votes === -2)) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });

    it('Should not parse repeated UUID if UUIDs present', (done: Done) => {
        fetch(getbaseURL() + `/api/segmentInfo?UUID=${downvotedID}&UUID=${lockedupID}&UUIDs=[\"${upvotedID}\"]`)
        .then(async res => {
            if (res.status !== 200) done("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length === 1 &&
                    (data[0].videoID === "upvoted" && data[0].votes === 2)) {
                    done();
                } else {
                    done("Received incorrect body: " + (await res.text()));
                }
            }
        })
        .catch(err => "Couldn't call endpoint");
    });
});
