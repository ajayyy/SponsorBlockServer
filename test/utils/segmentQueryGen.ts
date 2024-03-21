import { IDatabase } from "../../src/databases/IDatabase";
import { Service, VideoIDHash } from "../../src/types/segments.model";
import { HashedUserID } from "../../src/types/user.model";
import { genRandom, genRandomValue } from "./genRandom";
import { getHash } from "../../src/utils/getHash";

interface baseParams {
    videoID?: string
    hashedVideoID?: string | VideoIDHash | ""
    userID?: HashedUserID | ""
    service?: Service
    timeSubmitted?: number
    UUID?: string
}

// sponsorTimes
export interface insertSegmentParams extends baseParams {
    startTime?: number,
    endTime?: number,
    votes?: number,
    locked?: boolean | number,
    views?: number,
    category?: string,
    actionType?: string,
    videoDuration?: number,
    hidden?: boolean | number,
    reputation?: number,
    shadowHidden?: boolean | number,
    hashedVideoID?: string | VideoIDHash,
    userAgent?: string,
    description?: string
}
const defaultSegmentParams: insertSegmentParams = {
    videoID: "",
    startTime: 0,
    endTime: 10,
    votes: 0,
    locked: false,
    UUID: "",
    userID: "",
    timeSubmitted: 0,
    views: 0,
    category: "sponsor",
    actionType: "skip",
    service: Service.YouTube,
    videoDuration: 0,
    hidden: false,
    reputation: 0,
    shadowHidden: false,
    hashedVideoID: "" as VideoIDHash,
    userAgent: "",
    description: ""
};

const generateDefaults = (identifier: string) => ({
    videoID: `vid-${identifier}`,
    hashedVideoID: getHash(`vid-${identifier}`),
    userID: `user-${identifier}`,
    UUID: genRandomValue("uuid", identifier),
});

export const insertSegment = async(db: IDatabase, overrides: insertSegmentParams = {}, identifier?: string) => {
    const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "hidden", "reputation", "shadowHidden", "hashedVideoID", "userAgent", "description") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    // generate defaults
    identifier = identifier ?? genRandom();
    const defaults = generateDefaults(identifier);
    const params = { ...defaultSegmentParams, ...defaults, ...overrides };
    // convert bool to 0 | 1
    params.locked = Number(params.locked);
    params.hidden = Number(params.hidden);
    params.shadowHidden = Number(params.shadowHidden);
    // generate hashedVideoID if not provided
    params.hashedVideoID = (overrides?.hashedVideoID ?? getHash(params.videoID, 1)) as VideoIDHash;
    // debug
    await db.prepare("run", query, Object.values(params));
};
export const insertChapter = async(db: IDatabase, description: string, params: insertSegmentParams = {}) => {
    const overrides = { category: "chapter", actionType: "chapter", description, ...params };
    await insertSegment(db, overrides);
};

// titles
interface insertTitleParams extends baseParams {
    title?: string,
    original?: boolean | number,
}
const defaultTitleParams: insertTitleParams = {
    videoID: "",
    title: "",
    original: false,
    userID: "",
    service: Service.YouTube,
    hashedVideoID: "",
    timeSubmitted: 0,
    UUID: "",
};
export const insertTitle = async (db: IDatabase, overrides: insertTitleParams = {}, identifier?: string) => {
    const query = 'INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    // generate defaults
    identifier = identifier ?? genRandom();
    const defaults = generateDefaults(identifier);
    const params = { ...defaultTitleParams, ...defaults, ...overrides };
    params.title = genRandomValue("title", identifier);
    // convert bool to 0 | 1
    params.original = Number(params.original);
    await db.prepare("run", query, Object.values(params));
};
export const insertTitleVote = async (db: IDatabase, UUID: string, votes: number, locked = false, shadowHidden = false, verification = false) => {
    const query = 'INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden", "verification") VALUES (?, ?, ?, ?, ?)';
    const params = [UUID, votes, Number(locked), Number(shadowHidden), Number(verification)];
    await db.prepare("run", query, params);
};

interface insertThumbnailParams extends baseParams {
    original?: number,
}
const defaultThumbParams = {
    videoID: "",
    original: 0,
    userID: "",
    service: Service.YouTube,
    hashedVideoID: "",
    timeSubmitted: 0,
    UUID: "",
};
export const insertThumbnail = async (db: IDatabase, overrides: insertThumbnailParams = {}, identifier?: string) => {
    const query = 'INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?)';
    // generate defaults
    identifier = identifier ?? genRandom();
    const defaults = generateDefaults(identifier);
    const params = { ...defaultThumbParams, ...defaults, ...overrides };
    // convert bool to 0 | 1
    await db.prepare("run", query, Object.values(params));
};

export const insertThumbnailVote = async (db: IDatabase, UUID: string, votes: number, locked = false, shadowHidden = false) => {
    const query = 'INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, ?, ?, ?)';
    const params = [UUID, votes, Number(locked), Number(shadowHidden)];
    await db.prepare("run", query, params);
};