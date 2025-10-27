export interface ILockCategory {
    videoID: string;
    userID: string;
    actionType?: string;
    category: string;
    hashedVideoID?: string;
    reason?: string;
    service?: string;
    id?: number;
}

export class LockCategory {
    public videoID: string;
    public userID: string;
    public actionType: string;
    public category: string;
    public hashedVideoID: string;
    public reason: string;
    public service: string;
    public id: number | null;

    constructor(data: ILockCategory) {
        this.videoID = data.videoID;
        this.userID = data.userID;
        this.actionType = data?.actionType ?? "skip";
        this.category = data.category;
        this.hashedVideoID = data?.hashedVideoID ?? "";
        this.reason = data?.reason ?? "";
        this.service = data?.service ?? "YouTube";
        this.id = data?.id ?? null;
    }
}

