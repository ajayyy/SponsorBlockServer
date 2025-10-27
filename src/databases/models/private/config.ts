export interface IPrivateConfig {
    key: string;
    value: string;
}

export class PrivateConfig {
    // PK
    public key: string;
    public value: string;

    constructor(data: IPrivateConfig) {
        this.key = data.key;
        this.value = data.value;
    }
}
