export interface IThumbnailVote {
    UUID: string;
    votes?: number;
    locked?: number;
    shadowHidden?: number;
    downvotes?: number;
    removed?: number;
}

export class ThumbnailVote {
    public UUID: string;
    public votes: number = 0;
    public locked: number = 0;
    public shadowHidden: number = 0;
    public downvotes: number = 0;
    public removed: number = 0;

    constructor(data: IThumbnailVote) {
        Object.assign(this, data);
    }
}
