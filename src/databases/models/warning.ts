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
    public reason: string = '';
    public type: number = 0;

    constructor(data: IWarning) {
        Object.assign(this, data);
    }
}
