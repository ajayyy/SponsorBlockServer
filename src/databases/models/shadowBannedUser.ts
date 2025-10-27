export interface IShadowBannedUser {
    userID: string;
}

export class ShadowBannedUser {
    // PK
    public userID: string;

    constructor(data: IShadowBannedUser) {
        this.userID = data.userID;
    }
}
