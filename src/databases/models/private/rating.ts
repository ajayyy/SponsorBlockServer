export interface IPrivateRating {
    videoID: string;
    service?: string;
    userID: string;
    type: number;
    timeSubmitted: number;
    hashedIP: string;
    id?: number;
}

export class PrivateRating {
    public videoID: string;
    public service: string;
    public userID: string;
    public type: number;
    public timeSubmitted: number;
    public hashedIP: string;
    public id: number | null;

    constructor(data: IPrivateRating) {
        this.videoID = data.videoID;
        this.service = data?.service ?? "YouTube";
        this.userID = data.userID;
        this.type = data.type;
        this.timeSubmitted = data.timeSubmitted;
        this.hashedIP = data.hashedIP;
        this.id = data?.id ?? null;
    }
}
