import {getHash} from "./getHash";
import { HashedValue } from "../types/hash.model";
import { ActionType, VideoID } from "../types/segments.model";
import { UserID } from "../types/user.model";

export function getSubmissionUUID(videoID: VideoID, actionType: ActionType, userID: UserID, startTime: number, endTime: number): HashedValue{
    return `4${getHash(`${videoID}${startTime}${endTime}${userID}${actionType}`, 1)}` as HashedValue;
}
