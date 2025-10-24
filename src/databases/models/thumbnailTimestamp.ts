export interface IThumbnailTimestamp {
    UUID: string;
    timestamp: number;
}

export class ThumbnailTimestamp {
    public UUID: string;
    public timestamp: number;

    constructor(data: IThumbnailTimestamp) {
        Object.assign(this, data);
    }
}
