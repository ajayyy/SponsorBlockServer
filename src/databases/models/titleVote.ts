export interface ITitleVote {
    UUID?: string;
    votes?: number;
    locked?: number;
    shadowHidden?: number;
    verification?: number;
    downvotes?: number;
    removed?: number;
}

export class TitleVote {
    // PK
    public UUID: string|null;
    public votes: number;
    public locked: number;
    public shadowHidden: number;
    public verification: number;
    public downvotes: number;
    public removed: number;

    constructor(data: ITitleVote) {
        this.UUID = data?.UUID ?? null;
        this.votes = data?.votes ?? 0;
        this.locked = data?.locked ?? 0;
        this.shadowHidden = data?.shadowHidden ?? 0;
        this.verification = data?.verification ?? 0;
        this.downvotes = data?.downvotes ?? 0;
        this.removed = data?.removed ?? 0;
    }
}
