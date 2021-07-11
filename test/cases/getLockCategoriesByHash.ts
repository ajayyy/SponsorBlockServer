import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';
import assert from 'assert';


describe('getLockCategoriesByHash', () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-getLockCategories")]);
 
        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "hashedVideoID") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-1', 'sponsor', '67a654898fda3a5541774aea345796c7709982bb6018cb08d22a18eeddccc1d0']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-1', 'interaction', '67a654898fda3a5541774aea345796c7709982bb6018cb08d22a18eeddccc1d0']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-2', 'preview', 'dff09120437b4bd594dffae5f3cde3cfc5f6099fb01d0ef4051919b2908d9a50']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-3', 'nonmusic', 'bf1b122fd5630e0df8626d00c4a95c58954ad715e5595b0f75a19ac131e28928']);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'fakehash-1', 'outro', 'b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'fakehash-2', 'intro', 'b05acd1cd6ec7dffe5ffea64ada91ae7469d6db2ce21c7e30ad7fa62075d450']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'fakehash-2', 'preview', 'b05acd1cd6ec7dffe5ffea64ada91ae7469d6db2ce21c7e30ad7fa62075d450']);
    });

    it('Database should be greater or equal to version 18', async () => {
        const version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        if (version >= 18) return;
        else return 'Version isn\'t greater than 18. Version is ' + version;
    });

    it('Should be able to get multiple locks in one object', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/67a65')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            const expected = [{
                videoID: "getLockHash-1",
                hash: getHash("getLockHash-1", 1),
                categories: [
                    "sponsor",
                    "interaction"
                ]
            }];
            assert.deepStrictEqual(data, expected);
            done();
        })
        .catch(err => done(err));
    });

    it('Should be able to get single lock', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/dff09')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            const expected = [{
                videoID: "getLockHash-2",
                hash: getHash("getLockHash-2", 1),
                categories: [
                    "preview"
                ]
            }];
            assert.deepStrictEqual(data, expected);
            done();
        })
        .catch(err => done(err));
    });
    
    it('Should be able to get by half full hash', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/bf1b122fd5630e0df8626d00c4a95c58')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            const expected = [{
                videoID: "getLockHash-3",
                hash: getHash("getLockHash-3", 1),
                categories: [
                    "nonmusic"
                ]
            }];
            assert.deepStrictEqual(data, expected);
            done();
        })
        .catch(err => done(err));
    });

    it('Should be able to get multiple by similar hash with multiple categories', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/b05a')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            const expected = [{
                videoID: "fakehash-1",
                hash: "b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35",
                categories: [
                    "outro"
                ]
            }, {
                videoID: "fakehash-2",
                hash: "b05acd1cd6ec7dffe5ffea64ada91ae7469d6db2ce21c7e30ad7fa62075d450",
                categories: [
                    "intro",
                    "preview"
                ]
            }];
            assert.deepStrictEqual(data, expected);
            done();
        })
        .catch(err => done(err));
    });

    it('should return 404 once hash prefix varies', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/b05aa')
        .then(res => {
            assert.strictEqual(res.status, 404);
            done();
        })
        .catch(err => done(err));
    });

    it('should return 404 if no lock exists', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/aaaaaa')
        .then(res => {
            assert.strictEqual(res.status, 404);
            done();
        })
        .catch(err => done(err));
    });

    it('should return 400 if no videoID specified', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/')
        .then(res => {
            assert.strictEqual(res.status, 400);
            done();
        })
        .catch(err => done(err));
    });

    it('should return 400 if full hash sent', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35')
        .then(res => {
            assert.strictEqual(res.status, 400);
            done();
        })
        .catch(err => done(err));
    });
});
