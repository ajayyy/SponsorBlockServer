export interface IVipUser {
    userID: string;
}

export class VipUser {
    public userID: string;

    constructor(data: IVipUser) {
        Object.assign(this, data);
    }
}
