import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';


describe('getLockCategoriesByHash', () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-getLockCategories")]);
 
        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "reaspm", "hashedVideoID") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-1', 'sponsor', '1-reason-short', '67a654898fda3a5541774aea345796c7709982bb6018cb08d22a18eeddccc1d0']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-1', 'interaction', '1-longer-reason', '67a654898fda3a5541774aea345796c7709982bb6018cb08d22a18eeddccc1d0']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-2', 'preview', '2-reason', 'dff09120437b4bd594dffae5f3cde3cfc5f6099fb01d0ef4051919b2908d9a50']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLockHash-3', 'nonmusic', '3-reason', 'bf1b122fd5630e0df8626d00c4a95c58954ad715e5595b0f75a19ac131e28928']);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'fakehash-1', 'outro', 'fake1-reason', 'b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'fakehash-2', 'intro', 'fake2-longer-reason', 'b05acd1cd6ec7dffe5ffea64ada91ae7469d6db2ce21c7e30ad7fa62075d450']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'fakehash-2', 'preview', 'fake2-short', 'b05acd1cd6ec7dffe5ffea64ada91ae7469d6db2ce21c7e30ad7fa62075d450']);
    });

    it('Database should be greater or equal to version 18', async () => {
        const version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        if (version >= 20) return;
        else return 'Version isn\'t greater than 20. Version is ' + version;
    });

    it('Should be able to get multiple locks in one object', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/67a65')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 1) {
                    done(`Returned incorrect number of videos "${data.length}"`);
                } else if (data[0].videoID !== "getLockHash-1") {
                    done(`Returned incorrect videoID "${data[0].videoID}"`);
                } else if (data[0].hash !== getHash("getLockHash-1", 1)) {
                    done(`Returned incorrect hash "${data[0].hash}"`);
                } else if (data[0].categories[0] !== "sponsor") {
                    done(`Returned incorrect category "${data[0].categories[0]}"`);
                } else if (data[0].categories[1] !== "interaction") {
                    done(`Returned incorrect category "${data[0].categories[1]}"`);
                } else if (data[0].reason !== "1-longer-reason") {
                    done(`Returned incorrect reason "${data[0].reason}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('Should be able to get single lock', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/dff09')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 1) {
                    done('Returned incorrect number of videos "' + data.length + '"');
                } else if (data[0].videoID !== "getLockHash-2") {
                    done(`Returned incorrect videoID "${data[0].videoID}"`);
                } else if (data[0].hash !== getHash("getLockHash-2", 1)) {
                    done(`Returned incorrect hashedVideoID hash "${data[0].hash}"`);
                } else if (data[0].categories.length !== 1) {
                    done(`Returned incorrect number of categories "${data[0].categories.length}"`);
                } else if (data[0].categories[0] !== "preview") {
                    done(`Returned incorrect category "${data[0].categories[0]}"`);
                } else if (data[0].reason !== "2-reason") {
                    done(`Returned incorrect reason "${data[0].reason}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(() => ("couldn't call endpoint"));
    });
    
    it('Should be able to get by half full hash', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/bf1b122fd5630e0df8626d00c4a95c58')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 1) {
                    done('Returned incorrect number of videos "' + data.length + '"');
                } else if (data[0].videoID !== "getLockHash-3") {
                    done(`Returned incorrect videoID "${data[0].videoID}"`);
                } else if (data[0].hash !== getHash("getLockHash-3", 1)) {
                    done(`Returned incorrect hashedVideoID hash "${data[0].hash}"`);
                } else if (data[0].categories.length !== 1) {
                    done(`Returned incorrect number of categories "${data[0].categories.length}"`);
                } else if (data[0].categories[0] !== "nonmusic") {
                    done(`Returned incorrect category "${data[0].categories[0]}"`);
                } else if (data[0].reason !== "3-reason") {
                    done(`Returned incorrect reason "${data[0].reason}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('Should be able to get multiple by similar hash with multiple categories', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/b05a')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 2) {
                    done(`Returned incorrect number of locks "${data.length}"`);
                } else if (data[0].videoID !== "fakehash-1") {
                    done(`Returned incorrect videoID "${data[0].videoID}"`);
                } else if (data[1].videoID !== "fakehash-2") {
                    done(`Returned incorrect videoID "${data[1].videoID}"`);
                } else if (data[0].hash !== "b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35") {
                    done(`Returned incorrect hashedVideoID hash "${data[0].hash}"`);
                } else if (data[1].hash !== "b05acd1cd6ec7dffe5ffea64ada91ae7469d6db2ce21c7e30ad7fa62075d450") {
                    done(`Returned incorrect hashedVideoID hash "${data[1].hash}"`);
                } else if (data[0].categories.length !== 1) {
                    done(`Returned incorrect number of categories "${data[0].categories.length}"`);
                } else if (data[1].categories.length !== 2) {
                    done(`Returned incorrect number of categories "${data[1].categories.length}"`);
                } else if (data[0].categories[0] !== "outro") {
                    done(`Returned incorrect category "${data[0].category}"`);
                } else if (data[1].categories[0] !== "intro") {
                    done(`Returned incorrect category "${data[1].category}"`);
                } else if (data[1].categories[1] !== "preview") {
                    done(`Returned incorrect category "${data[1].category}"`);
                } else if (data[0].reason !== "fake1-reason") {
                    done(`Returned incorrect reason "${data[0].reason}"`);
                } else if (data[1].reason !== "fake2-longer-reason") {
                    done(`Returned incorrect reason "${data[1].reason}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('should return 404 once hash prefix varies', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/aaaaaa')
        .then(res => {
            if (res.status !== 404) done('non 404 (' + res.status + ')');
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('should return 404 if no lock exists', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/aaaaaa')
        .then(res => {
            if (res.status !== 404) done('non 404 (' + res.status + ')');
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('should return 400 if no videoID specified', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('should return 400 if full hash sent', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories/b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });
});
