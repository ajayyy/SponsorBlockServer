import { HashedValue } from "./hash.model";
import { SBRecord } from "./lib.model";
import { HashedUserID, UserID } from "./user.model";

export type SegmentUUID = string & { __segmentUUIDBrand: unknown };
export type VideoID = string & { __videoIDBrand: unknown };
export type VideoDuration = number & { __videoDurationBrand: unknown };
export type Category = ("sponsor" | "selfpromo" | "interaction" | "intro" | "outro" | "preview" | "music_offtopic" | "poi_highlight" | "chapter") & { __categoryBrand: unknown };
export type VideoIDHash = VideoID & HashedValue;
export type IPAddress = string & { __ipAddressBrand: unknown };
export type HashedIP = IPAddress & HashedValue;

export enum ActionType {
    Skip = "skip",
    Mute = "mute",
    Chapter = "chapter",
    Full = "full",
    Poi = "poi"
}

// Uncomment as needed
export enum Service {
    YouTube = "YouTube",
    PeerTube = "PeerTube",
    // Twitch = 'Twitch',
    // Nebula = 'Nebula',
    // RSS = 'RSS',
    // Corridor = 'Corridor',
    // Lbry = 'Lbry'
}

export interface IncomingSegment {
    category: Category;
    actionType: ActionType;
    segment: string[];
    description?: string;

    // Used to remove in pre-check stage
    ignoreSegment?: boolean;
}

export interface Segment {
    category: Category;
    actionType: ActionType;
    segment: number[];
    UUID: SegmentUUID;
    videoDuration: VideoDuration;
}

export enum Visibility {
    VISIBLE = 0,
    HIDDEN = 1
}

export interface DBSegment {
    category: Category;
    actionType: ActionType;
    startTime: number;
    endTime: number;
    UUID: SegmentUUID;
    userID: UserID;
    votes: number;
    views: number;
    locked: boolean;
    hidden: boolean;
    required: boolean; // Requested specifically from the client
    shadowHidden: Visibility;
    videoID: VideoID;
    videoDuration: VideoDuration;
    reputation: number;
    hashedVideoID: VideoIDHash;
    timeSubmitted: number;
    userAgent: string;
    service: Service;
    description: string;
}

export interface OverlappingSegmentGroup {
    segments: DBSegment[],
    votes: number;
    locked: boolean; // Contains a locked segment
    required: boolean; // Requested specifically from the client
    reputation: number;
}

export interface VotableObject {
    votes: number;
    reputation: number;
    locked: boolean;
}

export interface VotableObjectWithWeight extends VotableObject {
    weight: number;
}

export interface VideoData {
    hash: VideoIDHash;
    segments: Segment[];
}

export interface SegmentCache {
    shadowHiddenSegmentIPs: SBRecord<VideoID, SBRecord<string, {hashedIP: HashedIP}[]>>,
    userHashedIP?: HashedIP
}

export interface DBLock {
    videoID: VideoID,
    userID: HashedUserID,
    actionType: ActionType,
    category: Category,
    hashedVideoID: VideoIDHash,
    reason: string,
    service: Service,
}

export enum SortableFields {
    timeSubmitted = "timeSubmitted",
    startTime = "startTime",
    endTime = "endTime",
    votes = "votes",
    views = "views",
}
