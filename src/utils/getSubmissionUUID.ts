import { getHash } from "./getHash";
import { HashedValue } from "../types/hash.model";
import { ActionType, VideoID, Service } from "../types/segments.model";
import { UserID } from "../types/user.model";

export function getSubmissionUUID(
    videoID: VideoID,
    actionType: ActionType,
    userID: UserID,
    startTime: number,
    endTime: number,
    service: Service
) : HashedValue {
    return `5${getHash(`${videoID}${startTime}${endTime}${userID}${actionType}${service}`, 1)}` as HashedValue;
}
