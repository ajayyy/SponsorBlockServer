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

export function shaHashKey(singleIter: HashedValue): string {
    if (singleIter.length !== 64) Logger.warn(`Redis sha.hash key is not length 64! ${singleIter}`);

    return `sha.hash.${singleIter}`;
}