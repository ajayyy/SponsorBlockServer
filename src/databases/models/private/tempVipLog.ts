export interface IPrivateTempVipLog {
    issuerUserID: string;
    targetUserID: string
    enabled: boolean;
    updatedAt?: number;
    id?: number;
}

export class PrivateTempVipLog {
    public issuerUserID: string;
    public targetUserID: string
    public enabled: boolean;
    public updatedAt: number;
    // SERIAL PK
    public id: number | null;

    constructor(data: IPrivateTempVipLog) {
        this.issuerUserID = data.issuerUserID;
        this.targetUserID = data.targetUserID;
        this.enabled = data.enabled;
        this.updatedAt = data?.updatedAt ?? Date.now();
        this.id = data?.id ?? null;
    }
}
