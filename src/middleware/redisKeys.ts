import { Service, VideoID, VideoIDHash } from "../types/segments.model";
import { Logger } from "../utils/logger";

export function skipSegmentsKey(videoID: VideoID, service: Service): string {
    return "segments." + service + ".videoID." + videoID;
} 

export function skipSegmentsHashKey(hashedVideoIDPrefix: VideoIDHash, service: Service): string {
    hashedVideoIDPrefix = hashedVideoIDPrefix.substring(0, 4) as VideoIDHash;
    if (hashedVideoIDPrefix.length !== 4) Logger.warn("Redis skip segment hash-prefix key is not length 4! " + hashedVideoIDPrefix);
    
    return "segments." + service + "." + hashedVideoIDPrefix;
} 