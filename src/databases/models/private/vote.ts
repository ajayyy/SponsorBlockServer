export interface IPrivateVote {
    UUID: string;
    userID: string;
    hashedIP: string;
    type: number;
    originalVoteType: number;
    id: number;
}

export class PrivateVote {
    public UUID: string;
    public userID: string;
    public hashedIP: string;
    public type: number;
    public originalVoteType: number;
    public id: number;

    constructor(data: IPrivateVote) {
        Object.assign(this, data);
    }
}
