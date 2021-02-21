import { Category, VideoID } from "../types/segments.model";

export function skipSegmentsKey(videoID: VideoID): string {
    return "segments-" + videoID;
} 
