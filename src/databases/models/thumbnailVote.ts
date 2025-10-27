export interface IThumbnailVote {
    UUID?: string;
    votes?: number;
    locked?: number;
    shadowHidden?: number;
    downvotes?: number;
    removed?: number;
}

export class ThumbnailVote {
    public UUID: string|null;
    public votes: number;
    public locked: number;
    public shadowHidden: number;
    public downvotes: number;
    public removed: number;

    constructor(data: IThumbnailVote) {
        this.UUID = data?.UUID ?? null;
        this.votes = data?.votes ?? 0;
        this.locked = data?.locked ?? 0;
        this.shadowHidden = data?.shadowHidden ?? 0;
        this.downvotes = data?.downvotes ?? 0;
        this.removed = data?.removed ?? 0;
    }
}
