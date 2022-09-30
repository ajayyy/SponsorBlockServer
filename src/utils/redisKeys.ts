import { Service, VideoID, VideoIDHash } from "../types/segments.model";
import { Feature, HashedUserID, UserID } from "../types/user.model";
import { HashedValue } from "../types/hash.model";
import { Logger } from "./logger";

export const skipSegmentsKey = (videoID: VideoID, service: Service): string =>
    `segments.v4.${service}.videoID.${videoID}`;

export const skipSegmentGroupsKey = (videoID: VideoID, service: Service): string =>
    `segments.groups.v3.${service}.videoID.${videoID}`;

export function skipSegmentsHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 4) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 4) Logger.warn(`Redis skip segment hash-prefix key is not length 4! ${hashedVideoIDPrefix}`);

    return `segments.v4.${service}.${hashedVideoIDPrefix}`;
}

export const shadowHiddenIPKey = (videoID: VideoID, timeSubmitted: number, service: Service): string =>
    `segments.${service}.videoID.${videoID}.shadow.${timeSubmitted}`;

export const reputationKey = (userID: UserID): string =>
    `reputation.user.${userID}`;

export function ratingHashKey(hashPrefix: VideoIDHash, service: Service): string {
    hashPrefix = hashPrefix.substring(0, 4) as VideoIDHash;
    if (hashPrefix.length !== 4) Logger.warn(`Redis rating hash-prefix key is not length 4! ${hashPrefix}`);

    return `rating.${service}.${hashPrefix}`;
}

export function shaHashKey(singleIter: HashedValue): string {
    if (singleIter.length !== 64) Logger.warn(`Redis sha.hash key is not length 64! ${singleIter}`);

    return `sha.hash.${singleIter}`;
}

export const tempVIPKey = (userID: HashedUserID): string =>
    `vip.temp.${userID}`;

export const videoLabelsKey = (videoID: VideoID, service: Service): string =>
    `labels.v1.${service}.videoID.${videoID}`;

export function videoLabelsHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 4) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 4) Logger.warn(`Redis skip segment hash-prefix key is not length 4! ${hashedVideoIDPrefix}`);

    return `labels.v1.${service}.${hashedVideoIDPrefix}`;
}

export function userFeatureKey (userID: HashedUserID, feature: Feature): string {
    return `user.${userID}.feature.${feature}`;
}