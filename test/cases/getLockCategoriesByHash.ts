import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';


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
    });

    it('Database should be greater or equal to version 18', async () => {
        let version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        if (version >= 18) return;
        else return 'Version isn\'t greater than 18. Version is ' + version;
    });

    it('Should be able to get multiple locks', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/67a65')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 2) {
                    done(`Returned incorrect number of locks "${data.length}"`);
                } else if (data[0].category !== "sponsor") {
                    done(`Returned incorrect category "${data[0].category}"`);
                } else if (data[1].category !== "interaction") {
                    done(`Returned incorrect category "${data[1].category}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should be able to get single locks', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/dff09')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 1) {
                    done('Returned incorrect number of locks "' + data.length + '"');
                } else if (data[0].category !== "preview") {
                    done(`Returned incorrect category "${data[0].category}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });
    
    it('Should be able to get by half full hash', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/bf1b122fd5630e0df8626d00c4a95c58')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 1) {
                    done('Returned incorrect number of locks "' + data.length + '"');
                } else if (data[0].category !== "nonmusic") {
                    done(`Returned incorrect category "${data[0].category}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should be able to get multiple by similar hash', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/b05a')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 2) {
                    done(`Returned incorrect number of locks "${data.length}"`);
                } else if (data[0].category !== "outro") {
                    done(`Returned incorrect category "${data[0].category}"`);
                } else if (data[1].category !== "intro") {
                    done(`Returned incorrect category "${data[1].category}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('should return 404 once hash prefix varies', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/aaaaaa')
        .then(res => {
            if (res.status !== 404) done('non 404 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('should return 404 if no lock exists', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/aaaaaa')
        .then(res => {
            if (res.status !== 404) done('non 404 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('should return 400 if no videoID specified', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('should return 400 if full hash sent', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });
});
