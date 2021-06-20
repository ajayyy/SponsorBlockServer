import fetch from 'node-fetch';

import * as utils from  '../utils';
import { getHash } from '../../src/utils/getHash';

import { db, privateDB } from '../../src/databases/databases';
import { Logger } from '../../src/utils/logger.js';

describe('unBan', () => {
  before(async () => {
    await db.prepare("run", `INSERT INTO "shadowBannedUsers" VALUES('testMan-unBan')`);
    await db.prepare("run", `INSERT INTO "shadowBannedUsers" VALUES('testWoman-unBan')`);
    await db.prepare("run", `INSERT INTO "shadowBannedUsers" VALUES('testEntity-unBan')`);

    await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES ('` + getHash("VIPUser-unBan") + "')");
    await db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category") VALUES ('` + getHash("VIPUser-unBan") + "', 'unBan-videoID-1', 'sponsor')");

    let startOfInsertSegmentQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES';
    await db.prepare("run", startOfInsertSegmentQuery + "('unBan-videoID-0', 1, 11, 2, 'unBan-uuid-0', 'testMan-unBan', 0, 50, 'sponsor', 1, '" + getHash('unBan-videoID-0', 1) + "')");
    await db.prepare("run", startOfInsertSegmentQuery + "('unBan-videoID-1', 1, 11, 2, 'unBan-uuid-1', 'testWoman-unBan', 0, 50, 'sponsor', 1, '" + getHash('unBan-videoID-1', 1) + "')");
    await db.prepare("run", startOfInsertSegmentQuery + "('unBan-videoID-1', 1, 11, 2, 'unBan-uuid-2', 'testEntity-unBan', 0, 60, 'sponsor', 1, '" + getHash('unBan-videoID-1', 1) + "')");
    await db.prepare("run", startOfInsertSegmentQuery + "('unBan-videoID-2', 1, 11, 2, 'unBan-uuid-3', 'testEntity-unBan', 0, 60, 'sponsor', 1, '" + getHash('unBan-videoID-2', 1) + "')");
  });

  it('Should be able to unban a user and re-enable shadow banned segments', (done) => {
    fetch(utils.getbaseURL() + "/api/shadowBanUser?userID=testMan-unBan&adminUserID=VIPUser-unBan&enabled=false", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(async res => {
      if (res.status === 200) {
        let result = await db.prepare('all', 'SELECT * FROM "sponsorTimes" WHERE "videoID" = ? AND "userID" = ? AND "shadowHidden" = ?', ['unBan-videoID-0', 'testMan-unBan', 1]);
        if (result.length !== 0) {
          console.log(result);
          done("Expected 0 banned entrys in db, got " + result.length);
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

  it('Should be able to unban a user and re-enable shadow banned segments without lockCategories entrys', (done) => {
    fetch(utils.getbaseURL() + "/api/shadowBanUser?userID=testWoman-unBan&adminUserID=VIPUser-unBan&enabled=false", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(async res => {
        if (res.status === 200) {
            let result = await db.prepare('all', 'SELECT * FROM "sponsorTimes" WHERE "videoID" = ? AND "userID" = ? AND "shadowHidden" = ?', ['unBan-videoID-1', 'testWoman-unBan', 1]);
            if (result.length !== 1) {
                console.log(result);
                done("Expected 1 banned entry1 in db, got " + result.length);
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

  it('Should be able to unban a user and re-enable shadow banned segments with a mix of lockCategories entrys', (done) => {
    fetch(utils.getbaseURL() + "/api/shadowBanUser?userID=testEntity-unBan&adminUserID=VIPUser-unBan&enabled=false", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(async res => {
      if (res.status === 200) {
        let result = await db.prepare('all', 'SELECT * FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?', ['testEntity-unBan', 1]);
        if (result.length !== 1) {
          console.log(result);
          done("Expected 1 banned entry1 in db, got " + result.length);
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
});
