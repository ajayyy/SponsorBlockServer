import { Service, VideoID, VideoIDHash } from "../types/segments.model";
import { UserID } from "../types/user.model";
import { HashedValue } from "../types/hash.model";
import { Logger } from "./logger";

export function skipSegmentsKey(videoID: VideoID, service: Service): string {
    return `segments.v2.${service}.videoID.${videoID}`;
}

export function skipSegmentsHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 4) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 4) Logger.warn(`Redis skip segment hash-prefix key is not length 4! ${hashedVideoIDPrefix}`);

    return `segments.v2.${service}.${hashedVideoIDPrefix}`;
}

export function reputationKey(userID: UserID): string {
    return `reputation.user.${userID}`;
}

export function ratingHashKey(hashPrefix: VideoIDHash, service: Service): string {
    hashPrefix = hashPrefix.substring(0, 4) as VideoIDHash;
    if (hashPrefix.length !== 4) Logger.warn(`Redis rating hash-prefix key is not length 4! ${hashPrefix}`);

    return `rating.${service}.${hashPrefix}`;
}

export function userHashKey(userID: HashedValue): string {
    if (userID.length !== 64) Logger.warn(`Redis userHash key is not length 64! ${userID}`);

    return `user.${userID}`;
}