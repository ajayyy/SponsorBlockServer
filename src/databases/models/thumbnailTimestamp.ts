export interface IThumbnailTimestamp {
    UUID?: string;
    timestamp: number;
}

export class ThumbnailTimestamp {
    // PK
    public UUID: string|null;
    public timestamp: number;

    constructor(data: IThumbnailTimestamp) {
        this.UUID = data?.UUID ?? null;
        this.timestamp = data.timestamp;
    }
}
