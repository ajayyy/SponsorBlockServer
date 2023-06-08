import { Service, VideoID, VideoIDHash } from "./segments.model";
import { UserID } from "./user.model";

export type BrandingUUID = string & { readonly __brandingUUID: unique symbol };

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
    locked: number
}

export interface TitleResult {
    title: string,
    original: boolean,
    votes: number,
    locked: boolean,
    UUID: BrandingUUID
}

export interface ThumbnailDBResult extends BrandingDBSubmission {
    timestamp?: number,
    original: number,
    votes: number,
    locked: number
}

export interface ThumbnailResult {
    timestamp?: number,
    original: boolean,
    votes: number,
    locked: boolean,
    UUID: BrandingUUID
}

export interface BrandingResult {
    titles: TitleResult[],
    thumbnails: ThumbnailResult[],
    randomTime: number
}

export interface BrandingHashDBResult {
    titles: TitleDBResult[],
    thumbnails: ThumbnailDBResult[],
    segments: BrandingSegmentDBResult[]
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
}

export interface BrandingSegmentDBResult {
    startTime: number;
    endTime: number;
    videoDuration: number;
}

export interface BrandingSegmentHashDBResult extends BrandingDBSubmissionData {
    startTime: number;
    endTime: number;
    videoDuration: number;
}