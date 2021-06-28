import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';

describe('lockCategoriesRecords', () => {
    beforeAll(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-lockCategories")]);
 
        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category") VALUES (?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id', 'sponsor']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id', 'intro']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id-1', 'sponsor']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id-1', 'intro']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'lockCategoryVideo', 'sponsor']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'delete-record', 'sponsor']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'delete-record-1', 'sponsor']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'delete-record-1', 'intro']);
    });

    it('Should update the database version when starting the application', async () => {
        let version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        if (version > 1) return;
        else return 'Version isn\'t greater than 1. Version is ' + version;
    });

    it('Should be able to submit categories not in video (http response)', async () => {
        let json = {
            videoID: 'no-segments-video-id',
            userID: 'VIPUser-lockCategories',
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

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        if (res.status === 200) {
            const data = await res.json();
            if (JSON.stringify(data) !== JSON.stringify(expected)) {
                throw new Error("Incorrect response: expected " + JSON.stringify(expected) + " got " + JSON.stringify(data));
            }
        } else {
            const body = await res.text();
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit categories not in video (sql check)', async () => {
        let json = {
            videoID: 'no-segments-video-id-1',
            userID: 'VIPUser-lockCategories',
            categories: [
                'outro',
                'shilling',
                'shilling',
                'shil ling',
                '',
                'intro',
            ],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        if (res.status === 200) {
            let result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['no-segments-video-id-1']);
            if (result.length !== 4) {
                throw new Error("Expected 4 entrys in db, got " + result.length);
            }
        } else {
            const body = await res.text();
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit categories with _ in the category', async () => {
        let json = {
            videoID: 'underscore',
            userID: 'VIPUser-lockCategories',
            categories: [
                'word_word',
            ],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 200) {
            let result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['underscore']);
            if (result.length !== 1) {
                throw new Error("Expected 1 entrys in db, got " + result.length);
            }
        } else {
            const body = await res.text();
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit categories with upper and lower case in the category', async () => {
        let json = {
            videoID: 'bothCases',
            userID: 'VIPUser-lockCategories',
            categories: [
                'wordWord',
            ],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 200) {
            let result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['bothCases']);
            if (result.length !== 1) {
                throw new Error("Expected 1 entrys in db, got " + result.length);
            }
        } else {
            const body = await res.text();
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should not be able to submit categories with $ in the category', async () => {
        let json = {
            videoID: 'specialChar',
            userID: 'VIPUser-lockCategories',
            categories: [
                'word&word',
            ],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 200) {
            let result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['specialChar']);
            if (result.length !== 0) {
                throw new Error("Expected 0 entrys in db, got " + result.length);
            }
        } else {
            const body = await res.text();
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should return 400 for missing params', () =>
        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        }).then(res => {
            if (res.status !== 400) {
                throw new Error("Status code was " + res.status);
            }
        })
    );

    it('Should return 400 for no categories', async () => {
        let json: any = {
            videoID: 'test',
            userID: 'test',
            categories: [],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status !== 400) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should return 400 for no userID', async () => {
        let json: any = {
            videoID: 'test',
            userID: null,
            categories: ['sponsor'],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status !== 400) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should return 400 for no videoID', async () => {
        let json: any = {
            videoID: null,
            userID: 'test',
            categories: ['sponsor'],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status !== 400) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should return 400 object categories', async () => {
        let json = {
            videoID: 'test',
            userID: 'test',
            categories: {},
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status !== 400) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should return 400 bad format categories', async () => {
        let json = {
            videoID: 'test',
            userID: 'test',
            categories: 'sponsor',
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status !== 400) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should return 403 if user is not VIP', async () => {
        let json = {
            videoID: 'test',
            userID: 'test',
            categories: [
                'sponsor',
            ],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status !== 403) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to delete a lockCategories record', async () => {
        let json = {
            videoID: 'delete-record',
            userID: 'VIPUser-lockCategories',
            categories: [
                'sponsor',
            ],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 200) {
            let result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['delete-record']);
            if (result.length !== 0) {
                throw new Error("Didn't delete record");
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to delete one lockCategories record without removing another', async () => {
        let json = {
            videoID: 'delete-record-1',
            userID: 'VIPUser-lockCategories',
            categories: [
                'sponsor',
            ],
        };

        const res = await fetch(getbaseURL() + "/api/lockCategories", {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        if (res.status === 200) {
            let result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['delete-record-1']);
            if (result.length !== 1) {
                throw new Error("Didn't delete record");
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });


    /*
     * Submission tests in this file do not check database records, only status codes.
     * To test the submission code properly see ./test/cases/postSkipSegments.js
     */

    it('Should not be able to submit a segment to a video with a lock-category record (single submission)', async () => {
        const res = await fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testman42",
                videoID: "lockCategoryVideo",
                segments: [{
                    segment: [20, 40],
                    category: "sponsor",
                }],
            }),
        })
        if (res.status !== 403) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should not be able to submit segments to a video where any of the submissions with a no-segment record', async () => {
        const res = await fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testman42",
                videoID: "lockCategoryVideo",
                segments: [{
                    segment: [20, 40],
                    category: "sponsor",
                }, {
                    segment: [50, 60],
                    category: "intro",
                }],
            },),
        })
        if (res.status !== 403) {
            throw new Error("Status code was " + res.status);
        }
    });


    it('Should  be able to submit a segment to a video with a different no-segment record', async () => {
        const res = await fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testman42",
                videoID: "lockCategoryVideo",
                segments: [{
                    segment: [20, 40],
                    category: "intro",
                }],
            }),
        })
        if (res.status !== 200) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit a segment to a video with no no-segment records', async () => {
        const res = await fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
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
        if (res.status !== 200) {
            throw new Error("Status code was " + res.status);
        }
    });
});
