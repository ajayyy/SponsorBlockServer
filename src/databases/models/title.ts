import crypto from "crypto";

export interface ITitle {
    videoID: string;
    title: string;
    original?: number;
    userID: string;
    service: string;
    hashedVideoID: string;
    timeSubmitted: number;
    UUID?: string;
}

export class Title {
    public videoID: string;
    public title: string;
    public original: number = 0;
    public userID: string;
    public service: string;
    public hashedVideoID: string;
    public timeSubmitted: number;
    // PK
    public UUID: string;

    constructor(data: ITitle) {
        this.videoID = data.videoID;
        this.title = data.title;
        this.original = data?.original ?? 0;
        this.userID = data.userID;
        this.service = data.service;
        this.hashedVideoID = data.hashedVideoID;
        this.timeSubmitted = data.timeSubmitted;
        this.UUID = data?.UUID ?? crypto.randomUUID();
    }
}
