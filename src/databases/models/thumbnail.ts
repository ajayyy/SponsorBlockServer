export interface IThumbnail {
    original?: number;
    userID: string;
    service: string;
    hashedVideoID: string;
    timeSubmitted: number;
    UUID: string;
}

export class Thumbnail {
    public original: number = 0;
    public userID: string;
    public service: string;
    public hashedVideoID: string;
    public timeSubmitted: number;
    public UUID: string;

    constructor(data: IThumbnail) {
        Object.assign(this, data);
    }
}
