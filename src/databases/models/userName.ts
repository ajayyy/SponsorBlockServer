export interface IUserName {
    userID: string;
    userName: string;
    locked?: number;
}

export class UserName {
    public userID: string;
    public userName: string;
    public locked: number;

    constructor(data: IUserName) {
        this.userID = data.userID;
        this.userName = data.userName;
        this.locked = data?.locked ?? 0;
    }
}
