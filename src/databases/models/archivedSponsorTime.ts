export interface IArchivedSponsorTime {
    videoID: string;
    startTime: number;
    endTime: number;
    votes: number;
    locked?: number;
    incorrectVotes?: number;
    UUID: string;
    userID: string;
    timeSubmitted: number;
    views: number;
    category?: string;
    actionType?: string;
    service?: string;
    videoDuration?: number;
    hidden?: number;
    reputation?: number;
    shadowHidden: number;
    hashedVideoID?: string;
    userAgent?: string;
    description?: string;
}

export class ArchivedSponsorTime {
    public videoID: string;
    public startTime: number;
    public endTime: number;
    public votes: number;
    public locked: number = 0;
    public incorrectVotes: number = 1;
    public UUID: string;
    public userID: string;
    public timeSubmitted: number;
    public views: number;
    public category: string = 'sponsor';
    public actionType: string = 'skip';
    public service: string = 'YouTube';
    public videoDuration: number = 0;
    public hidden: number = 0;
    public reputation: number = 0;
    public shadowHidden: number;
    public hashedVideoID: string = '';
    public userAgent: string = '';
    public description: string = '';

    constructor(data: IArchivedSponsorTime) {
        Object.assign(this, data);
    }
}
