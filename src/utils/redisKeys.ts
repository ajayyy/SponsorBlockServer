import { Service, VideoID, VideoIDHash } from "../types/segments.model";
import { Feature, HashedUserID, UserID } from "../types/user.model";
import { HashedValue } from "../types/hash.model";
import { Logger } from "./logger";
import { BrandingUUID } from "../types/branding.model";

export const skipSegmentsKey = (videoID: VideoID, service: Service): string =>
    `segments.v5.${service}.videoID.${videoID}`;

export const skipSegmentGroupsKey = (videoID: VideoID, service: Service): string =>
    `segments.groups.v4.${service}.videoID.${videoID}`;

export function skipSegmentsHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 4) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 4) Logger.warn(`Redis skip segment hash-prefix key is not length 4! ${hashedVideoIDPrefix}`);

    return `segments.v5.${service}.${hashedVideoIDPrefix}`;
}

export const brandingKey = (videoID: VideoID, service: Service): string =>
    `branding.v3.${service}.videoID.${videoID}`;

export function brandingHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 4) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 4) Logger.warn(`Redis skip segment hash-prefix key is not length 4! ${hashedVideoIDPrefix}`);

    return `branding.v3.${service}.${hashedVideoIDPrefix}`;
}

export const brandingIPKey = (uuid: BrandingUUID): string =>
    `branding.v1.shadow.${uuid}`;


export const shadowHiddenIPKey = (videoID: VideoID, timeSubmitted: number, service: Service): string =>
    `segments.v1.${service}.videoID.${videoID}.shadow.${timeSubmitted}`;

export const reputationKey = (userID: UserID): string =>
    `reputation.v1.user.${userID}`;

export function ratingHashKey(hashPrefix: VideoIDHash, service: Service): string {
    hashPrefix = hashPrefix.substring(0, 4) as VideoIDHash;
    if (hashPrefix.length !== 4) Logger.warn(`Redis rating hash-prefix key is not length 4! ${hashPrefix}`);

    return `rating.v1.${service}.${hashPrefix}`;
}

export function shaHashKey(singleIter: HashedValue): string {
    if (singleIter.length !== 64) Logger.warn(`Redis sha.hash key is not length 64! ${singleIter}`);

    return `sha.hash.${singleIter}`;
}

export const tempVIPKey = (userID: HashedUserID): string =>
    `vip.temp.${userID}`;

export const videoLabelsKey = (videoID: VideoID, service: Service): string =>
    `labels.v2.${service}.videoID.${videoID}`;

export function videoLabelsHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 3) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 3) Logger.warn(`Redis video labels hash-prefix key is not length 3! ${hashedVideoIDPrefix}`);

    return `labels.v2.${service}.${hashedVideoIDPrefix}`;
}

export function userFeatureKey (userID: HashedUserID, feature: Feature): string {
    return `user.v1.${userID}.feature.${feature}`;
}