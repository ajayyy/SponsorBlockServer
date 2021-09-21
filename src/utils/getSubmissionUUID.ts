import { getHash } from "./getHash.js";
import { HashedValue } from "../types/hash.model.js";
import { ActionType, VideoID } from "../types/segments.model.js";
import { UserID } from "../types/user.model.js";

export function getSubmissionUUID(videoID: VideoID, actionType: ActionType, userID: UserID, startTime: number, endTime: number): HashedValue{
    return `4${getHash(`${videoID}${startTime}${endTime}${userID}${actionType}`, 1)}` as HashedValue;
}
