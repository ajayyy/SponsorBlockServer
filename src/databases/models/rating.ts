export interface IRating {
    videoID: string;
    service?: string;
    type: number;
    count: number;
    hashedVideoID: string;
    id: number;
}

export class Rating {
    public videoID: string;
    public service: string = 'YouTube';
    public type: number;
    public count: number;
    public hashedVideoID: string;
    public id: number;

    constructor(data: IRating) {
        Object.assign(this, data);
    }
}
