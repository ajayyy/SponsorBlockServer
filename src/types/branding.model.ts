import { Category, Service, VideoID, VideoIDHash } from "./segments.model";
import { UserID } from "./user.model";

export type BrandingUUID = string & { readonly __brandingUUID: unique symbol };

export type CasualCategory = ("funny" | "creative" | "clever" | "descriptive" | "other") & { __casualCategoryBrand: unknown };

export interface BrandingDBSubmissionData {
    videoID: VideoID,
}

export interface BrandingDBSubmission extends BrandingDBSubmissionData {
    shadowHidden: number,
    UUID: BrandingUUID,
    hashedVideoID: VideoIDHash
}

export interface TitleDBResult extends BrandingDBSubmission {
    title: string,
    original: number,
    votes: number,
    downvotes: number,
    locked: number,
    verification: number,
    userID: UserID
}

export interface TitleResult {
    title: string,
    original: boolean,
    votes: number,
    locked: boolean,
    UUID: BrandingUUID,
    userID?: UserID
}

export interface ThumbnailDBResult extends BrandingDBSubmission {
    timestamp?: number,
    original: number,
    votes: number,
    downvotes: number,
    locked: number,
    userID: UserID
}

export interface ThumbnailResult {
    timestamp?: number,
    original: boolean,
    votes: number,
    locked: boolean,
    UUID: BrandingUUID,
    userID?: UserID
}

export interface CasualVote {
    id: string,
    count: number
}

export interface BrandingResult {
    titles: TitleResult[],
    thumbnails: ThumbnailResult[],
    casualVotes: CasualVote[],
    randomTime: number,
    videoDuration: number | null
}

export interface BrandingHashDBResult {
    titles: TitleDBResult[];
    thumbnails: ThumbnailDBResult[];
    segments: BrandingSegmentDBResult[];
    casualVotes: CasualVoteDBResult[];
}

export interface OriginalThumbnailSubmission {
    original: true;
}

export interface TimeThumbnailSubmission {
    timestamp: number;
    original: false;
}

export type ThumbnailSubmission = OriginalThumbnailSubmission | TimeThumbnailSubmission;

export interface TitleSubmission {
    title: string;
    original: boolean;
}

export interface BrandingSubmission {
    title: TitleSubmission;
    thumbnail: ThumbnailSubmission;
    videoID: VideoID;
    userID: UserID;
    service: Service;
    autoLock: boolean | undefined;
    downvote: boolean | undefined;
    videoDuration: number | undefined;
    wasWarned: boolean | undefined;
    casualMode: boolean | undefined;
}

export interface CasualVoteSubmission {
    videoID: VideoID;
    userID: UserID;
    service: Service;
    downvote: boolean | undefined;
    categories: CasualCategory[];
}

export interface BrandingSegmentDBResult {
    startTime: number;
    endTime: number;
    category: Category;
    videoDuration: number;
}

export interface CasualVoteDBResult {
    category: CasualCategory;
    upvotes: number;
    downvotes: number;
}

export interface BrandingSegmentHashDBResult extends BrandingDBSubmissionData {
    startTime: number;
    endTime: number;
    category: Category;
    videoDuration: number;
}

export interface CasualVoteHashDBResult extends BrandingDBSubmissionData {
    category: CasualCategory;
    upvotes: number;
    downvotes: number;
}