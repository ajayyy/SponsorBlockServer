export interface IPrivateUserNameLog {
    userID: string;
    newUserName: string;
    oldUserName: string;
    updatedbyAdmin: boolean;
    updatedAt: number;
    id?: number;
}

export class PrivateUserNameLog {
    public userID: string;
    public newUserName: string;
    public oldUserName: string;
    public updatedbyAdmin: boolean;
    public updatedAt: number;
    public id: number;

    constructor(data: IPrivateUserNameLog) {
        Object.assign(this, data);
    }
}
