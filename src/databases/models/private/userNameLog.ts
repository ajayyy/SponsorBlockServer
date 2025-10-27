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
    // SERIAL PK
    public id: number|null;

    constructor(data: IPrivateUserNameLog) {
        this.userID = data.userID;
        this.newUserName = data.newUserName;
        this.oldUserName = data.oldUserName;
        this.updatedbyAdmin = data.updatedbyAdmin;
        this.updatedAt = data.updatedAt;
        this.id = data?.id ?? null;
    }
}
