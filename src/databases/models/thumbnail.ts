export interface IThumbnail {
    original?: number;
    userID: string;
    service: string;
    hashedVideoID: string;
    timeSubmitted: number;
    UUID?: string;
}

export class Thumbnail {
    public original: number = 0;
    public userID: string;
    public service: string;
    public hashedVideoID: string;
    public timeSubmitted: number;
    // PK
    public UUID: string|null;

    constructor(data: IThumbnail) {
        this.original = data?.original ?? 0;
        this.userID = data.userID;
        this.service = data.service;
        this.hashedVideoID = data.hashedVideoID;
        this.timeSubmitted = data.timeSubmitted;
        this.UUID = data?.UUID ?? null;
    }
}
