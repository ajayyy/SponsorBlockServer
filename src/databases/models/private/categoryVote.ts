export interface IPrivateCategoryVote {
    UUID: string;
    userID: string;
    hashedIP: string;
    category: string;
    timeSubmitted: number;
    id: number;
}

export class PrivateCategoryVote {
    public UUID: string;
    public userID: string;
    public hashedIP: string;
    public category: string;
    public timeSubmitted: number;
    public id: number;

    constructor(data: IPrivateCategoryVote) {
        Object.assign(this, data);
    }
}
