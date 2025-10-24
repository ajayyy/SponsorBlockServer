export interface ITitleVote {
    UUID: string;
    votes?: number;
    locked?: number;
    shadowHidden?: number;
    verification?: number;
    downvotes?: number;
    removed?: number;
}

export class TitleVote {
    public UUID: string;
    public votes: number = 0;
    public locked: number = 0;
    public shadowHidden: number = 0;
    public verification: number = 0;
    public downvotes: number = 0;
    public removed: number = 0;

    constructor(data: ITitleVote) {
        Object.assign(this, data);
    }
}
