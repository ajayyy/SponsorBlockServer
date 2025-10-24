export interface IUserFeature {
    userID: string;
    feature: number;
    issuerUserID: string;
    timeSubmitted: number;
}

export class UserFeature {
    public userID: string;
    public feature: number;
    public issuerUserID: string;
    public timeSubmitted: number;

    constructor(data: IUserFeature) {
        Object.assign(this, data);
    }
}
