export interface IPrivateSponsorTime {
    videoID: string;
    hashedIP: string;
    timeSubmitted: number;
    service?: string;
    id?: number;
}

export class PrivateSponsorTime {
    public videoID: string;
    public hashedIP: string;
    public timeSubmitted: number;
    public service: string;
    // SERIAL PK
    public id: number | null;

    constructor(data: IPrivateSponsorTime) {
        this.videoID = data.videoID;
        this.hashedIP = data.hashedIP;
        this.timeSubmitted = data.timeSubmitted;
        this.service = data?.service ?? "YouTube";
        this.id = data?.id ?? null;
    }
}
