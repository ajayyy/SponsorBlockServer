export interface IPrivateTempVipLog {
    issuerUserID: string;
    targetUserID: string
    enabled: boolean;
    updatedAt: number;
    id?: number;
}

export class PrivateTempVipLog {
    public issuerUserID: string;
    public targetUserID: string
    public enabled: boolean;
    public updatedAt: number;
    public id: number;
    
    constructor(data: IPrivateTempVipLog) {
        Object.assign(this, data);
    }
}
