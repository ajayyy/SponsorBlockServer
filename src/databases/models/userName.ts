export interface IUserName {
    userID: string;
    userName: string;
    locked?: number;
}

export class UserName {
    public userID: string;
    public userName: string;
    public locked: number = 0;

    constructor(data: IUserName) {
        Object.assign(this, data);
    }
}
