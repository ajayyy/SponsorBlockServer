export interface IConfig {
    key: string;
    value: string;
}

export class Config {
    public key: string;
    public value: string;

    constructor(data: IConfig) {
        Object.assign(this, data);
    }
}
