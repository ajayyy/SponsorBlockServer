import { HashedValue } from "./hash.model";
import { SBRecord } from "./lib.model";

export type SegmentUUID = string  & { __segmentUUIDBrand: unknown };
export type VideoID = string & { __videoIDBrand: unknown };
export type Category = string & { __categoryBrand: unknown };
export type VideoIDHash = VideoID & HashedValue;
export type IPAddress = string & { __ipAddressBrand: unknown };
export type HashedIP = IPAddress & HashedValue;

export interface Segment { 
    category: Category; 
    segment: number[]; 
    UUID: SegmentUUID;
}

export enum Visibility {
    VISIBLE = 0,
    HIDDEN = 1
}

export interface DBSegment { 
    category: Category; 
    startTime: number;
    endTime: number;
    UUID: SegmentUUID;
    votes: number;
    locked: boolean;
    shadowHidden: Visibility;
    videoID: VideoID;
    hashedVideoID: VideoIDHash;
}

export interface OverlappingSegmentGroup {
    segments: DBSegment[],
    votes: number;
    locked: boolean; // Contains a locked segment
}

export interface VotableObject {
    votes: number;
}

export interface VotableObjectWithWeight extends VotableObject {
    weight: number;
}

export interface VideoData {
    hash: VideoIDHash;
    segments: Segment[];
}

export interface SegmentCache {
    shadowHiddenSegmentIPs: SBRecord<VideoID, {hashedIP: HashedIP}[]>,
    userHashedIP?: HashedIP
}