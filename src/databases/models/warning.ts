export interface IWarning {
    userID: string;
    issueTime: number;
    issuerUserID: string;
    enabled: number;
    reason?: string;
    type?: number;
}

export class Warning {
    public userID: string;
    public issueTime: number;
    public issuerUserID: string;
    public enabled: number;
    public reason: string;
    public type: number;

    constructor(data: IWarning) {
        this.userID = data.userID;
        this.issueTime = data.issueTime;
        this.issuerUserID = data.issuerUserID;
        this.enabled = data.enabled;
        this.reason = data?.reason ?? "";
        this.type = data?.type ?? 0;
    }
}
