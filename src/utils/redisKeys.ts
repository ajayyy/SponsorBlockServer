import { Service, VideoID, VideoIDHash } from "../types/segments.model";
import { UserID } from "../types/user.model";
import { Logger } from "./logger";

export function skipSegmentsKey(videoID: VideoID, service: Service): string {
    return "segments.v2." + service + ".videoID." + videoID;
} 

export function skipSegmentsHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 4) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 4) Logger.warn("Redis skip segment hash-prefix key is not length 4! " + hashedVideoIDPrefix);
    
    return "segments.v2." + service + "." + hashedVideoIDPrefix;
} 

export function reputationKey(userID: UserID): string {
    return "reputation.user." + userID;
}