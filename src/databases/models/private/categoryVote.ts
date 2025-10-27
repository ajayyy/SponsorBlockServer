export interface IPrivateCategoryVote {
    UUID: string;
    userID: string;
    hashedIP: string;
    category: string;
    timeSubmitted: number;
    id?: number;
}

export class PrivateCategoryVote {
    public UUID: string;
    public userID: string;
    public hashedIP: string;
    public category: string;
    public timeSubmitted: number;
    // SERIAL PK
    public id: number|null;

    constructor(data: IPrivateCategoryVote) {
        this.UUID = data.UUID;
        this.userID = data.userID;
        this.hashedIP = data.hashedIP;
        this.category = data.category;
        this.timeSubmitted = data.timeSubmitted;
        this.id = data?.id ?? null;
    }
}
