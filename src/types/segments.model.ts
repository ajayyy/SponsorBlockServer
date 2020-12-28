export type SegmentUUID = string;
export type VideoID = string;
export type Category = string;
export type VideoIDHash = string;
export type IPHash = string;

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
    shadowHidden: Visibility;
    videoID: VideoID;
    hashedVideoID: VideoIDHash;
}

export interface OverlappingSegmentGroup {
    segments: DBSegment[],
    votes: number;
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
    shadowHiddenSegmentIPs: Record<VideoID, {hashedIP: IPHash}[]>,
    userHashedIP?: IPHash
}