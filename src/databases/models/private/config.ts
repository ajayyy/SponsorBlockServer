export interface IPrivateConfig {
    key: string;
    value: string;
}

export class PrivateConfig {
    public key: string;
    public value: string;

    constructor(data: IPrivateConfig) {
        Object.assign(this, data);
    }
}
