import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';
import {LockCategory} from '../../src/types/segments.model';

const deepEquals = (a,b) => {
    a.forEach((e) => { if (!b.includes(e)) return false; });
    return true;
};

describe('lockCategoriesRecords', () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-lockCategories")]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id', 'sponsor', 'reason-1']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id', 'intro', 'reason-1']);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id-1', 'sponsor', 'reason-2']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'no-segments-video-id-1', 'intro', 'reason-2']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'lockCategoryVideo', 'sponsor', 'reason-3']);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'delete-record', 'sponsor', 'reason-4']);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'delete-record-1', 'sponsor', 'reason-5']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), 'delete-record-1', 'intro', 'reason-5']);
    });

    it('Should update the database version when starting the application', async () => {
        const version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        if (version > 1) return;
        else return 'Version isn\'t greater than 1. Version is ' + version;
    });

    it('Should be able to submit categories not in video (http response)', (done: Done) => {
        const json = {
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

        const expected = {
            submitted: [
                'outro',
                'shilling',
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        .then(async res => {
            if (res.status === 200) {
                const data = await res.json();
                if (deepEquals(data, expected)) {
                    done();
                } else {
                    done("Incorrect response: expected " + JSON.stringify(expected) + " got " + JSON.stringify(data));
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories not in video (sql check)', (done: Done) => {
        const json = {
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

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        .then(async res => {
            if (res.status === 200) {
                const result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['no-segments-video-id-1']) as LockCategory[];
                if (result.length !== 4) {
                    done("Expected 4 entrys in db, got " + result.length);
                } else {
                    const oldRecordNotChangeReason = result.filter(item => {
                        return item.reason === 'reason-2' && ['sponsor', 'intro'].includes(item.category);
                    });

                    const newRecordWithEmptyReason = result.filter(item => {
                        return item.reason === '' && ['outro', 'shilling'].includes(item.category);
                    });

                    if (newRecordWithEmptyReason.length !== 2 || oldRecordNotChangeReason.length !== 2) {
                        done(`Incorrect reason update with oldRecordNotChangeReason=${oldRecordNotChangeReason} instead of 2 or  newRecordWithEmptyReason=${newRecordWithEmptyReason} instead of 2`);
                    } else {
                        done();
                    }
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories not in video with reason (http response)', (done: Done) => {
        const json = {
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
            reason: 'new reason'
        };

        const expected = {
            submitted: [
                'outro',
                'shilling',
                'intro'
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        .then(async res => {
            if (res.status === 200) {
                const data = await res.json();
                if (deepEquals(data, expected)) {
                    done();
                } else {
                    done("Incorrect response: expected " + JSON.stringify(expected) + " got " + JSON.stringify(data));
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories not in video with reason (sql check)', (done: Done) => {
        const json = {
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
            reason: 'new reason'
        };

        const expectedWithNewReason = [
            'outro',
            'shilling',
            'intro'
        ];

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json)
        })
        .then(async res => {
            if (res.status === 200) {
                const result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['no-segments-video-id-1']) as LockCategory[];
                if (result.length !== 4) {
                    done("Expected 4 entrys in db, got " + result.length);
                } else {
                    const newRecordWithNewReason = result.filter(item => {
                        return expectedWithNewReason.includes(item.category) && item.reason === 'new reason';
                    });

                    const oldRecordNotChangeReason = result.filter(item => {
                        return item.reason === 'reason-2';
                    });

                    if (newRecordWithNewReason.length !== 3) {
                        done("Expected 3 entrys in db with new reason, got " + newRecordWithNewReason.length);
                    } else if (oldRecordNotChangeReason.length !== 1) {
                        done("Expected 1 entrys in db with old reason, got " + oldRecordNotChangeReason.length);
                    } else {
                        done();
                    }
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories with _ in the category', (done: Done) => {
        const json = {
            videoID: 'underscore',
            userID: 'VIPUser-lockCategories',
            categories: [
                'word_word',
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                const result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['underscore']);
                if (result.length !== 1) {
                    done("Expected 1 entrys in db, got " + result.length);
                } else {
                    done();
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit categories with upper and lower case in the category', (done: Done) => {
        const json = {
            videoID: 'bothCases',
            userID: 'VIPUser-lockCategories',
            categories: [
                'wordWord',
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                const result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['bothCases']);
                if (result.length !== 1) {
                    done("Expected 1 entrys in db, got " + result.length);
                } else {
                    done();
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should not be able to submit categories with $ in the category', (done: Done) => {
        const json = {
            videoID: 'specialChar',
            userID: 'VIPUser-lockCategories',
            categories: [
                'word&word',
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                const result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['specialChar']);
                if (result.length !== 0) {
                    done("Expected 0 entrys in db, got " + result.length);
                } else {
                    done();
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for missing params', (done: Done) => {
        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        })
        .then(async res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for no categories', (done: Done) => {
        const json: any = {
            videoID: 'test',
            userID: 'test',
            categories: [],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for no userID', (done: Done) => {
        const json: any = {
            videoID: 'test',
            userID: null,
            categories: ['sponsor'],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for no videoID', (done: Done) => {
        const json: any = {
            videoID: null,
            userID: 'test',
            categories: ['sponsor'],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 object categories', (done: Done) => {
        const json = {
            videoID: 'test',
            userID: 'test',
            categories: {},
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 bad format categories', (done: Done) => {
        const json = {
            videoID: 'test',
            userID: 'test',
            categories: 'sponsor',
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 400) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 403 if user is not VIP', (done: Done) => {
        const json = {
            videoID: 'test',
            userID: 'test',
            categories: [
                'sponsor',
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 403) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to delete a lockCategories record', (done: Done) => {
        const json = {
            videoID: 'delete-record',
            userID: 'VIPUser-lockCategories',
            categories: [
                'sponsor',
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                const result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['delete-record']);
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

    it('Should be able to delete one lockCategories record without removing another', (done: Done) => {
        const json = {
            videoID: 'delete-record-1',
            userID: 'VIPUser-lockCategories',
            categories: [
                'sponsor',
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories", {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        })
        .then(async res => {
            if (res.status === 200) {
                const result = await db.prepare('all', 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ['delete-record-1']);
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

    it('Should not be able to submit a segment to a video with a lock-category record (single submission)', (done: Done) => {
        fetch(getbaseURL() + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
                videoID: "lockCategoryVideo",
                segments: [{
                    segment: [20, 40],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
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
                    userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
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
        .then(async res => {
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
                userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
                videoID: "lockCategoryVideo",
                segments: [{
                    segment: [20, 40],
                    category: "intro",
                }],
            }),
        })
        .then(async res => {
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
                    userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
                    videoID: "normalVideo",
                    segments: [{
                        segment: [20, 40],
                        category: "intro",
                    }],
                }),
        })
        .then(async res => {
            if (res.status === 200) {
                done();
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('should be able to get existing category lock', (done: Done) => {
        const expected = {
            categories: [
                'sponsor',
                'intro',
                'outro',
                'shilling'
            ],
        };

        fetch(getbaseURL() + "/api/lockCategories?videoID=" + "no-segments-video-id")
        .then(async res => {
            if (res.status === 200) {
                const data = await res.json();
                if (deepEquals(data, expected)) {
                    done();
                } else {
                    done("Incorrect response: expected " + JSON.stringify(expected) + " got " + JSON.stringify(data));
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to get hashedVideoID from lock', (done: Done) => {
        const hashedVideoID = getHash('no-segments-video-id', 1);
        db.prepare('get', 'SELECT "hashedVideoID" FROM "lockCategories"  WHERE "videoID" = ?', ['no-segments-video-id'])
        .then(result => {
            if (result !== hashedVideoID) {
                done();
            } else {
                done("Got unexpected video hash " + result);
            }
        });
    });
});
