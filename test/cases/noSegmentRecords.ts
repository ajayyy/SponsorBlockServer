import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';


describe('noSegmentRecords', () => {
    before(() => {
        db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("VIPUser-noSegments") + "')");

        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id', 'sponsor')");
        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id', 'intro')");

        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id-1', 'sponsor')");
        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'no-segments-video-id-1', 'intro')");
        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'noSubmitVideo', 'sponsor')");

        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'delete-record', 'sponsor')");

        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'delete-record-1', 'sponsor')");
        db.exec("INSERT INTO noSegments (userID, videoID, category) VALUES ('" + getHash("VIPUser-noSegments") + "', 'delete-record-1', 'intro')");
    });

    it('Should update the database version when starting the application', (done: Done) => {
        let version = db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version']).value;
        if (version > 1) done();
        else done('Version isn\'t greater than 1. Version is ' + version);
    });

    it('Should be able to submit categories not in video (http response)', (done: Done) => {
        let json = {
            videoID: 'no-segments-video-id',
            userID: 'VIPUser-noSegments',
            categories: [
                'outro',
                'shilling',
                'shilling',
                'shil ling',
                '',
                'intro',
            ],
        };

        let expected = {
            submitted: [
                'outro',
                'shilling',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        .then(async res => {
            if (res.status === 200) {
                const data = await res.json();
                if (JSON.stringify(data) === JSON.stringify(expected)) {
                    done();
                } else {
                    done("Incorrect response: expected " + JSON.stringify(expected) + " got " + JSON.stringify(data));
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories not in video (sql check)', (done: Done) => {
        let json = {
            videoID: 'no-segments-video-id-1',
            userID: 'VIPUser-noSegments',
            categories: [
                'outro',
                'shilling',
                'shilling',
                'shil ling',
                '',
                'intro',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        .then(async res => {
            if (res.status === 200) {
                let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['no-segments-video-id-1']);
                if (result.length !== 4) {
                    console.log(result);
                    done("Expected 4 entrys in db, got " + result.length);
                } else {
                    done();
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories with _ in the category', (done: Done) => {
        let json = {
            videoID: 'underscore',
            userID: 'VIPUser-noSegments',
            categories: [
                'word_word',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['underscore']);
                if (result.length !== 1) {
                    console.log(result);
                    done("Expected 1 entrys in db, got " + result.length);
                } else {
                    done();
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories with upper and lower case in the category', (done: Done) => {
        let json = {
            videoID: 'bothCases',
            userID: 'VIPUser-noSegments',
            categories: [
                'wordWord',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['bothCases']);
                if (result.length !== 1) {
                    console.log(result);
                    done("Expected 1 entrys in db, got " + result.length);
                } else {
                    done();
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should not be able to submit categories with $ in the category', (done: Done) => {
        let json = {
            videoID: 'specialChar',
            userID: 'VIPUser-noSegments',
            categories: [
                'word&word',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['specialChar']);
                if (result.length !== 0) {
                    console.log(result);
                    done("Expected 0 entrys in db, got " + result.length);
                } else {
                    done();
                }
            } else {
                const body = await res.text();
                console.log(body);
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for missing params', (done: Done) => {
        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        })
        .then(res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for no categories', (done: Done) => {
        let json: any = {
            videoID: 'test',
            userID: 'test',
            categories: [],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for no userID', (done: Done) => {
        let json: any = {
            videoID: 'test',
            userID: null,
            categories: ['sponsor'],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for no videoID', (done: Done) => {
        let json: any = {
            videoID: null,
            userID: 'test',
            categories: ['sponsor'],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 object categories)', (done: Done) => {
        let json = {
            videoID: 'test',
            userID: 'test',
            categories: {},
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 bad format categories', (done: Done) => {
        let json = {
            videoID: 'test',
            userID: 'test',
            categories: 'sponsor',
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 403 if user is not VIP', (done: Done) => {
        let json = {
            videoID: 'test',
            userID: 'test',
            categories: [
                'sponsor',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 403) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to delete a noSegment record', (done: Done) => {
        let json = {
            videoID: 'delete-record',
            userID: 'VIPUser-noSegments',
            categories: [
                'sponsor',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 200) {
                let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['delete-record']);
                if (result.length === 0) {
                    done();
                } else {
                    done("Didn't delete record");
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to delete one noSegment record without removing another', (done: Done) => {
        let json = {
            videoID: 'delete-record-1',
            userID: 'VIPUser-noSegments',
            categories: [
                'sponsor',
            ],
        };

        fetch(getbaseURL() + "/api/noSegments", {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(res => {
            if (res.status === 200) {
                let result = db.prepare('all', 'SELECT * FROM noSegments WHERE videoID = ?', ['delete-record-1']);
                if (result.length === 1) {
                    done();
                } else {
                    done("Didn't delete record");
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });


    /*
     * Submission tests in this file do not check database records, only status codes.
     * To test the submission code properly see ./test/cases/postSkipSegments.js
     */

    it('Should not be able to submit a segment to a video with a no-segment record (single submission)', (done: Done) => {
        fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testman42",
                videoID: "noSubmitVideo",
                segments: [{
                    segment: [20, 40],
                    category: "sponsor",
                }],
            }),
        })
        .then(res => {
            if (res.status === 403) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should not be able to submit segments to a video where any of the submissions with a no-segment record', (done: Done) => {
        fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                    userID: "testman42",
                    videoID: "noSubmitVideo",
                    segments: [{
                        segment: [20, 40],
                        category: "sponsor",
                    }, {
                        segment: [50, 60],
                        category: "intro",
                    }],
                },),
        })
        .then(res => {
            if (res.status === 403) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });


    it('Should  be able to submit a segment to a video with a different no-segment record', (done: Done) => {
        fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testman42",
                videoID: "noSubmitVideo",
                segments: [{
                    segment: [20, 40],
                    category: "intro",
                }],
            }),
        })
        .then(res => {
            if (res.status === 200) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit a segment to a video with no no-segment records', (done: Done) => {
        fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                    userID: "testman42",
                    videoID: "normalVideo",
                    segments: [{
                        segment: [20, 40],
                        category: "intro",
                    }],
                }),
        })
        .then(res => {
            if (res.status === 200) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });
});
