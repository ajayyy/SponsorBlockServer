export interface ISponsorTime {
    videoID: string;
    startTime: number;
    endTime: number;
    votes: number;
    locked: number;
    incorrectVotes?: number;
    UUID?: string;
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

export class SponsorTime {
    public videoID: string;
    public startTime: number;
    public endTime: number;
    public votes: number;
    public locked: number;
    public incorrectVotes: number;
    // PK
    public UUID: string | null;
    public userID: string;
    public timeSubmitted: number;
    public views: number;
    public category: string;
    public actionType: string;
    public service: string;
    public videoDuration: number;
    public hidden: number;
    public reputation: number;
    public shadowHidden: number;
    public hashedVideoID: string;
    public userAgent: string;
    public description: string;

    constructor(data: ISponsorTime) {
        this.videoID = data.videoID;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.votes = data.votes;
        this.locked = data.locked;
        this.incorrectVotes = data.incorrectVotes ?? 1;
        this.UUID = data.UUID ?? null;
        this.userID = data.userID;
        this.timeSubmitted = data.timeSubmitted;
        this.views = data.views;
        this.category = data.category ?? "sponsor";
        this.actionType = data.actionType ?? "skip";
        this.service = data.service ?? "YouTube";
        this.videoDuration = data.videoDuration ?? 0;
        this.hidden = data.hidden ?? 0;
        this.reputation = data.reputation ?? 0;
        this.shadowHidden = data.shadowHidden;
        this.hashedVideoID = data.hashedVideoID ?? "";
        this.userAgent = data.userAgent ?? "";
        this.description = data.description ?? "";
    }
}
