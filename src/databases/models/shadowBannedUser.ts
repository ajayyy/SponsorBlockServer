export interface IShadowBannedUser {
    userID: string;
}

export class ShadowBannedUser {
    public userID: string;

    constructor(data: IShadowBannedUser) {
        Object.assign(this, data);
    }
}
