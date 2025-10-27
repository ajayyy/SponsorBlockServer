export interface IRating {
    videoID: string;
    service?: string;
    type: number;
    count: number;
    hashedVideoID: string;
    // SERIAL PK
    id?: number;
}

export class Rating {
    public videoID: string;
    public service: string;
    public type: number;
    public count: number;
    public hashedVideoID: string;
    public id: number | null;

    constructor(data: IRating) {
        this.videoID = data.videoID;
        this.service = data?.service ?? "YouTube";
        this.type = data.type;
        this.count = data.count;
        this.hashedVideoID = data.hashedVideoID;
        this.id = data?.id ?? null;
    }
}
