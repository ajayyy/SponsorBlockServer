export interface IPrivateSponsorTime {
    videoID: string;
    hashedIP: string;
    timeSubmitted: number;
    service?: string;
    id: number;
}

export class PrivateSponsorTime {
    public videoID: string;
    public hashedIP: string;
    public timeSubmitted: number;
    public service: string = 'YouTube';
    public id: number;

    constructor(data: IPrivateSponsorTime) {
        Object.assign(this, data);
    }
}
