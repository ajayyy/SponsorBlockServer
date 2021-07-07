import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {db} from '../../src/databases/databases';


describe('getLockCategories', () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-getLockCategories")]);
 
        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-1', 'sponsor', '1-short']);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-1', 'interaction', '2-longer-reason']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-2', 'preview', '2-reason']);
 
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-getLockCategories"), 'getLock-3', 'nonmusic', '3-reason']);
    });

    it('Should update the database version when starting the application', async () => {
        const version = (await db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version'])).value;
        if (version > 20) return;
        else return 'Version isn\'t greater than 20. Version is ' + version;
    });

    it('Should be able to get multiple locks', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories?videoID=getLock-1')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.categories.length !== 2) {
                    done(`Returned incorrect number of locks "${data.categories.length}"`);
                } else if (data.categories[0] !== "sponsor") {
                    done(`Returned incorrect category "${data.categories[0]}"`);
                } else if (data.categories[1] !== "interaction") {
                    done(`Returned incorrect category "${data.categories[1]}"`);
                } else if (data.reason !== "1-longer-reason") {
                    done(`Returned incorrect reason "${data.reason}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('Should be able to get single locks', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories?videoID=getLock-2')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.categories.length !== 1) {
                    done('Returned incorrect number of locks "' + data.categories.length + '"');
                } else if (data.categories[0] !== "preview") {
                    done(`Returned incorrect category "${data.categories[0].category}"`);
                } else if (data.reason !== "2-reason") {
                    done(`Returned incorrect reason "${data.reason}"`);
                } else {
                    done(); // pass
                }
            }
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('should return 404 if no lock exists', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories?videoID=getLock-0')
        .then(res => {
            if (res.status !== 404) done('non 404 (' + res.status + ')');
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });

    it('should return 400 if no videoID specified', (done: Done) => {
        fetch(getbaseURL() + '/api/lockCategories')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(() => ("couldn't call endpoint"));
    });
});
