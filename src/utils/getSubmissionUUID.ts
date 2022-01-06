import { getHash } from "./getHash";
import { HashedValue } from "../types/hash.model";
import { ActionType, VideoID, Service, Category } from "../types/segments.model";
import { UserID } from "../types/user.model";

export function getSubmissionUUID(
    videoID: VideoID,
    category: Category,
    actionType: ActionType,
    userID: UserID,
    startTime: number,
    endTime: number,
    service: Service
) : HashedValue {
    return `${getHash(`${videoID}${startTime}${endTime}${userID}${category}${actionType}${service}`, 1)}6` as HashedValue;
}
