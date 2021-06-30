import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {IDatabase} from "../../src/databases/IDatabase";

declare const db: IDatabase

const ENOENTID =        "0".repeat(64);
const upvotedID =       "a"+"0".repeat(63);
const downvotedID =     "b"+"0".repeat(63);
const lockedupID =      "c"+"0".repeat(63);
const infvotesID =      "d"+"0".repeat(63);
const shadowhiddenID =  "e"+"0".repeat(63);
const lockeddownID =    "f"+"0".repeat(63);
const hiddenID =        "1"+"0".repeat(63);
const fillerID1 =       "11"+"0".repeat(62);
const fillerID2 =       "12"+"0".repeat(62);
const fillerID3 =       "13"+"0".repeat(62);
const fillerID4 =       "14"+"0".repeat(62);
const fillerID5 =       "15"+"0".repeat(62);
const oldID =           `${'0'.repeat(8)}-${'0000-'.repeat(3)}${'0'.repeat(12)}`;

describe('getSegmentInfo', () => {
    beforeAll(async () => {
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

    it('Should be able to retreive upvoted segment', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${upvotedID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "upvoted" || data[0].votes !== 2) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive downvoted segment', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${downvotedID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "downvoted" || data[0].votes !== -2) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive locked up segment', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${lockedupID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "locked-up" || data[0].locked !== 1 || data[0].votes !== 2) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive infinite vote segment', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${infvotesID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "infvotes" || data[0].votes !== 100000) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive shadowhidden segment', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${shadowhiddenID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "shadowhidden" || data[0].shadowHidden !== 1) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive locked down segment', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${lockeddownID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "locked-down" || data[0].votes !== -2 || data[0].locked !== 1) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive hidden segment', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${hiddenID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "hidden" || data[0].hidden !== 1) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive segment with old ID', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${oldID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "oldID" || data[0].votes !== 1) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be able to retreive single segment in array',  async() => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}"]`)
            if (res.status !== 200) throw new Error("Status code was: " + res.status);
            else {
                const data = await res.json();
                if (data.length !== 1 || data[0].videoID !== "upvoted" || data[0].votes !== 2) {
                    throw new Error("Received incorrect body: " + (await res.text()));
                }
            }
    });

    it('Should be able to retreive multiple segments in array', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}", "${downvotedID}"]`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (!(data.length === 2 &&
                (data[0].videoID === "upvoted" && data[0].votes === 2) &&
                (data[1].videoID === "downvoted" && data[1].votes === -2))) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should be possible to send unexpected query parameters', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${upvotedID}&fakeparam=hello&category=sponsor`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data[0].videoID !== "upvoted" || data[0].votes !== 2) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should return 400 if array passed to UUID', () =>
        fetch(getbaseURL() + `/api/segmentInfo?UUID=["${upvotedID}", "${downvotedID}"]`)
        .then(res => {
            if (res.status !== 400) throw new Error("non 400 respone code: " + res.status);
        })
    );

    it('Should return 400 if bad array passed to UUIDs', () =>
        fetch(getbaseURL() + "/api/segmentInfo?UUIDs=[not-quoted,not-quoted]")
        .then(res => {
            if (res.status !== 400) throw new Error("non 404 respone code: " + res.status);
        })
    );

    it('Should return 400 if bad UUID passed', () =>
        fetch(getbaseURL() + "/api/segmentInfo?UUID=notarealuuid")
        .then(res => {
            if (res.status !== 400) throw new Error("non 400 respone code: " + res.status);
        })
    );

    it('Should return 400 if bad UUIDs passed in array', () =>
        fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["notarealuuid", "anotherfakeuuid"]`)
        .then(res => {
            if (res.status !== 400) throw new Error("non 400 respone code: " + res.status);
        })
    );

    it('Should return good UUID when mixed with bad UUIDs', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}", "anotherfakeuuid"]`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 1 || data[0].videoID !== "upvoted" || data[0].votes !== 2) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should cut off array at 10', async () => {
        const filledIDArray = `["${upvotedID}", "${downvotedID}", "${lockedupID}", "${shadowhiddenID}", "${lockeddownID}", "${hiddenID}", "${fillerID1}", "${fillerID2}", "${fillerID3}", "${fillerID4}", "${fillerID5}"]`
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUIDs=${filledIDArray}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            // last segment should be fillerID4
            if (data.length !== 10 || data[0].videoID !== "upvoted" || data[0].votes !== 2 || data[9].videoID !== "filler" || data[9].UUID !== fillerID4) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    }, 10000);

    it('Should not duplicate reponses', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUIDs=["${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${downvotedID}"]`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (data.length !== 2 || data[0].videoID !== "upvoted" || data[0].votes !== 2 || data[1].videoID !== "downvoted" || data[1].votes !== -2) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should return 400 if UUID not found', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${ENOENTID}`)
        if (res.status !== 400) throw new Error("non 400 respone code: " + res.status);
    });

    it('Should be able to retreive multiple segments with multiple parameters', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${upvotedID}&UUID=${downvotedID}`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (!(data.length === 2 &&
                (data[0].videoID === "upvoted" && data[0].votes === 2) &&
                (data[1].videoID === "downvoted" && data[1].votes === -2))) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });

    it('Should not parse repeated UUID if UUIDs present', async () => {
        const res = await fetch(getbaseURL() + `/api/segmentInfo?UUID=${downvotedID}&UUID=${lockedupID}&UUIDs=[\"${upvotedID}\"]`)
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const data = await res.json();
            if (!(data.length === 1 &&
                (data[0].videoID === "upvoted" && data[0].votes === 2))) {
                throw new Error("Received incorrect body: " + (await res.text()));
            }
        }
    });
});
