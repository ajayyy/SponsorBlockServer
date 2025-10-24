export interface ILockCategory {
    videoID: string;
    userID: string;
    actionType?: string;
    category: string;
    hashedVideoID?: string;
    reason?: string;
    service?: string;
    id: number;
}

export class LockCategory {
    public videoID: string;
    public userID: string;
    public actionType: string = 'skip';
    public category: string;
    public hashedVideoID: string = '';
    public reason: string = '';
    public service: string = 'YouTube';
    public id: number;

    constructor(data: ILockCategory) {
        Object.assign(this, data);
    }
}

