import { IDatabase } from "../../src/databases/IDatabase";
import { Service, VideoIDHash, VideoID } from "../../src/types/segments.model";
import { HashedUserID, UserID } from "../../src/types/user.model";
import { genRandom } from "./getRandom";
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

// sponsorTimes
export const insertSegment = async(db: IDatabase, fnname: string, testcase: string, params: insertSegmentParams = defaultSegmentParams) => {
    const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID", "description") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    // corrections for parameters
    const identifier = `${fnname}-${testcase}`;
    const correctedParams = params;
    // generate defaults
    const videoID = (params.videoID || `vid-${identifier}`) as VideoID;
    const userID = (params.userID || `user-${identifier}`) as UserID;
    if (!params.videoID) correctedParams.videoID = videoID;
    if (!params.UUID) correctedParams.UUID = `uuid-${identifier}-${genRandom(2)}`;
    if (!params.userID) correctedParams.userID = getHash(userID);
    if (!params.hashedVideoID) correctedParams.hashedVideoID = getHash(videoID);
    // convert bool to 0 | 1
    correctedParams.locked = Number(params.locked);
    correctedParams.hidden = Number(params.hidden);
    correctedParams.shadowHidden = Number(params.shadowHidden);
    await db.prepare("run", query, Object.values(correctedParams));
};