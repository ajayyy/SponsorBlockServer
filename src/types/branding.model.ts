import { VideoID, VideoIDHash } from "./segments.model";

export type BrandingUUID = string & { readonly __brandingUUID: unique symbol };

export interface BrandingDBSubmission {
    shadowHidden: number,
    UUID: BrandingUUID,
    videoID: VideoID,
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
    thumbnails: ThumbnailResult[]
}

export interface BrandingHashDBResult {
    branding: {
        titles: TitleDBResult[],
        thumbnails: ThumbnailDBResult[]
    };
}

export interface BrandingHashResult {
    branding: BrandingResult;
}