export interface IConfig {
    key: string;
    value: string;
}

export class Config {
    // PK
    public key: string;
    public value: string;

    constructor(data: IConfig) {
        this.key = data.key;
        this.value = data.value;
    }
}
