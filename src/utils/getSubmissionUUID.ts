import { getHash } from "#utils/getHash";

import { HashedValue } from "#types/hash";
import { ActionType, VideoID, Service, Category } from "#types/segments";
import { HashedUserID } from "#types/user";

export function getSubmissionUUID(
    videoID: VideoID,
    category: Category,
    actionType: ActionType,
    description: string,
    userID: HashedUserID,
    startTime: number,
    endTime: number,
    service: Service
) : HashedValue {
    return `${getHash(`${videoID}${startTime}${endTime}${userID}${description}${category}${actionType}${service}`, 1)}7` as HashedValue;
}
