import { Logger } from "../utils/logger";
import { IDatabase, QueryType } from "./IDatabase";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import MysqlInterface from "sync-mysql";

export class Mysql implements IDatabase {
    private connection: any;

    constructor(private config: unknown) {
    }

    // eslint-disable-next-line require-await
    async init(): Promise<void> {
        this.connection = new MysqlInterface(this.config);
    }

    prepare(type: QueryType, query: string, params?: any[]): Promise<any[]> {
        Logger.debug(`prepare (mysql): type: ${type}, query: ${query}, params: ${params}`);
        const queryResult = this.connection.query(query, params);

        switch (type) {
            case "get": {
                return queryResult[0];
            }
            case "all": {
                return queryResult;
            }
            case "run": {
                break;
            }
        }
    }

}
