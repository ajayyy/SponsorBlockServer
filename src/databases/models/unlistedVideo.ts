export interface IUnlistedVideo {
    videoID: string;
    year: string;
    views: string;
    channelID: string;
    timeSubmitted: number;
    service?: string;
    id?: number;
}

export class UnlistedVideo {
    public videoID: string;
    public year: string;
    public views: string;
    public channelID: string;
    public timeSubmitted: number;
    public service: string = "YouTube";
    // SERIAL PK
    public id: number;

    constructor(data: IUnlistedVideo) {
        Object.assign(this, data);
    }
}
