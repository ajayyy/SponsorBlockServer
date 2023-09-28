import { IDatabase } from "../../src/databases/IDatabase";
import { Service, VideoIDHash, VideoID } from "../../src/types/segments.model";
import { HashedUserID, UserID } from "../../src/types/user.model";
import { genRandom, genRandomValue } from "./getRandom";
import { getHash } from "../../src/utils/getHash";

type insertSegmentParams = {
    videoID?: string,
    startTime?: number,
    endTime?: number,
    votes?: number,
    locked?: boolean | number,
    UUID?: string,
    userID?: HashedUserID | "",
    timeSubmitted?: number,
    views?: number,
    category?: string,
    actionType?: string,
    service?: Service,
    videoDuration?: number,
    hidden?: boolean | number,
    shadowHidden?: boolean | number,
    hashedVideoID?: VideoIDHash | "",
    description?: string
};
const defaultSegmentParams: insertSegmentParams = {
    videoID: "",
    startTime: 0,
    endTime: 0,
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
    shadowHidden: false,
    hashedVideoID: "",
    description: ""
};

export const insertSegment = async(db: IDatabase, params: insertSegmentParams = {}) => {
    const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID", "description") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    // corrections for parameters
    const correctedParams = { ...defaultSegmentParams, ...params };
    const identifier = genRandom(7); // 7 to fill out videoID
    // generate defaults
    const videoID = (params.videoID || `vid-${identifier}`) as VideoID;
    const userID = (params.userID || `user-${identifier}`) as UserID;
    if (!params.videoID) correctedParams.videoID = videoID;
    if (!params.UUID) correctedParams.UUID = genRandomValue("uuid", identifier, 2);
    if (!params.userID) correctedParams.userID = getHash(userID);
    if (!params.hashedVideoID) correctedParams.hashedVideoID = getHash(videoID);
    // convert bool to 0 | 1
    correctedParams.locked = Number(correctedParams.locked);
    correctedParams.hidden = Number(correctedParams.hidden);
    correctedParams.shadowHidden = Number(correctedParams.shadowHidden);
    await db.prepare("run", query, Object.values(correctedParams));
};
export const insertChapter = async(db: IDatabase, description: string, params: insertSegmentParams = {}) => {
    const overrides = { category: "chapter", actionType: "chapter", description, ...params };
    await insertSegment(db, overrides);
};