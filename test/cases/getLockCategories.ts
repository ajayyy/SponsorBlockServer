import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';


describe('lockCategoriesRecords', () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-getLockCategories")]);
 
        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category") VALUES (?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-1', 'sponsor']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-1', 'intro']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-2', 'preview']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-3', 'nonmusic']);
    });

    it('Should update the database version when starting the application', async () => {
        let version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        if (version > 1) return;
        else return 'Version isn\'t greater than 1. Version is ' + version;
    });

    it('Should be able to get multiple locks', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories?videoID=getLock-1')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.length !== 2) {
                    done(`Returned incorrect number of locks "${data.length}"`);
                } else if (data[0].category !== "sponsor") {
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

    it('Should be able to get single locks', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories?videoID=getLock-2')
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

    it('should return 404 if no lock exists', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories?videoID=getLock-0')
        .then(res => {
            if (res.status !== 404) done('non 404 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('should return 400 if no videoID specified', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => ("couldn't call endpoint"));
    });
});
