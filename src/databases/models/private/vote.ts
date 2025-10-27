export interface IPrivateVote {
    UUID: string;
    userID: string;
    hashedIP: string;
    type: number;
    originalVoteType: number;
    id?: number;
}

export class PrivateVote {
    public UUID: string;
    public userID: string;
    public hashedIP: string;
    public type: number;
    public originalVoteType: number;
    // SERIAL PK
    public id: number|null;

    constructor(data: IPrivateVote) {
        this.UUID = data.UUID;
        this.userID = data.userID;
        this.hashedIP = data.hashedIP;
        this.type = data.type;
        this.originalVoteType = data.originalVoteType;
        this.id = data?.id ?? null;
    }
}
