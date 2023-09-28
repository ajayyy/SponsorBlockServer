import { IDatabase } from "../../src/databases/IDatabase";
import { HashedUserID } from "../../src/types/user.model";
import { User, userArray, usernameUserArray } from "./genUser";
import { Feature } from "../../src/types/user.model";

// segments
export { insertSegment } from "./segmentQueryGen";

// vip
export const insertVip = async (db: IDatabase, userID: HashedUserID) => {
    const query = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
    await db.prepare("run", query, [userID]);
};
export const insertVipUser = async (db: IDatabase, user: User) => {
    await insertVip(db, user.pubID);
};
export const insertVipBulk = async (db: IDatabase, users: userArray) => {
    for (const user of Object.values(users))
        await insertVip(db, user.pubID);
};

// userFeatures
export const grantFeature = async (db: IDatabase, target: HashedUserID, feature: Feature, issuer = "default-issuer", time = 0) => {
    const query = 'INSERT INTO "userFeatures" ("userID", "feature", "issuerUserID", "timeSubmitted") VALUES(?, ?, ?, ?)';
    await db.prepare("run", query, [target, feature, issuer, time]);
};
export const bulkGrantFeature = async (db: IDatabase, users: userArray, feature: Feature, issuer: User, time = 0) => {
    for (const user of Object.values(users))
        await grantFeature(db, user.pubID, feature, issuer.pubID, time);
};

// usernames
export const insertUsername = async (db: IDatabase, userID: HashedUserID, userName: string, locked = false) => {
    const query = 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)';
    const lockedValue = Number(locked);
    await db.prepare("run", query, [userID, userName, lockedValue]);
};
export const insertUsernameBulk = async (db: IDatabase, users: usernameUserArray) => {
    for (const user of Object.values(users))
        await insertUsername(db, user.pubID, user.username, false);
};
