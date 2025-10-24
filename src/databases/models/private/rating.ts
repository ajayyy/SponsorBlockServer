export interface IPrivateRating {
    videoID: string;
    service?: string;
    userID: string;
    type: number;
    timeSubmitted: number;
    hashedIP: string;
    id: number;
}

export class PrivateRating {
    public videoID: string;
    public service: string = 'YouTube';
    public userID: string;
    public type: number;
    public timeSubmitted: number;
    public hashedIP: string;
    public id: number;

    constructor(data: IPrivateRating) {
        Object.assign(this, data);
    }
}
