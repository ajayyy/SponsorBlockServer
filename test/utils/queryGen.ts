import { IDatabase } from "../../src/databases/IDatabase";
import { HashedUserID } from "../../src/types/user.model";
import { User, userArray, usernameUserArray } from "./genUser";
import { Feature } from "../../src/types/user.model";
import { ActionType, Category, Service, VideoIDHash } from "../../src/types/segments.model";
import { genRandomValue } from "./getRandom";
import { getHash } from "../../src/utils/getHash";

// segments
export { insertSegment } from "./segmentQueryGen";

// vip
export const insertVip = async (db: IDatabase, userID: HashedUserID) => {
    const query = 'INSERT INTO "vipUsers" ("userID", "createdAt") VALUES (?, ?)';
    await db.prepare("run", query, [userID, new Date().toISOString()]);
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

// videoInfo
export const insertVideoInfo = async (db: IDatabase, videoID: string, channelID: string, title = "", published = 0) => {
    const query = 'INSERT INTO "videoInfo" ("videoID", "channelID", "title", "published") VALUES(?, ?, ?, ?)';
    await db.prepare("run", query, [videoID, channelID, title, published]);
};

interface lockParams {
    videoID?: string,
    userID?: HashedUserID | "",
    actionType?: ActionType | string,
    category?: Category | string,
    hashedVideoID?: VideoIDHash | "",
    reason?: string,
    service?: Service | string
}

export const insertLock = async(db: IDatabase, overrides: lockParams = {}) => {
    const query = 'INSERT INTO "lockCategories" ("videoID", "userID", "actionType", "category", "hashedVideoID", "reason", "service") VALUES (?, ?, ?, ?, ?, ?, ?)';
    const identifier = "lock";
    const defaults = {
        videoID: genRandomValue("video", identifier), userID: genRandomValue("user", identifier),
        actionType: "skip", category: "sponsor", hashedVideoID: "", reason: "", service: Service.YouTube
    };
    const params = { ...defaults, ...overrides };
    params.hashedVideoID = getHash(params.videoID);
    await db.prepare("run", query, Object.values(params));
};

// warning
type warningParams = {
    userID?: HashedUserID,
    issueTime?: number,
    issuerUserID?: HashedUserID,
    enabled?: boolean | number,
    reason?: string,
    type?: number
}
export const insertWarning = async (db: IDatabase, userID: HashedUserID, overrides: warningParams = {}) => {
    const defaults = { userID, issueTime: 0, issuerUserID: "vip-user", enabled: true, reason: "default-warn-reason", type: 0 };
    const params = { ...defaults, ...overrides };
    params.enabled = Number(params.enabled);
    const query = 'INSERT INTO "warnings" ("userID", "issueTime", "issuerUserID", "enabled", "reason", "type") VALUES(?, ?, ?, ?, ?, ?)';
    await db.prepare("run", query, Object.values(params));
};
// ban
export const insertBan = async (db: IDatabase, userID: HashedUserID) => {
    const query = 'INSERT INTO "shadowBannedUsers" ("userID") VALUES (?)';
    await db.prepare("run", query, [userID]);
};
