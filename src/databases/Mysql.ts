import {Logger} from '../utils/logger';
import {IDatabase, QueryType} from './IDatabase';
// @ts-ignore
import MysqlInterface from 'sync-mysql';

export class Mysql implements IDatabase {
    private connection: any;

    constructor(private config: any) {
    }

    init(): void {
        this.connection = new MysqlInterface(this.config);
    }

    prepare(type: QueryType, query: string, params?: any[]) {
        Logger.debug(`prepare (mysql): type: ${type}, query: ${query}, params: ${params}`);
        const queryResult = this.connection.query(query, params);

        switch (type) {
            case 'get': {
                return queryResult[0];
            }
            case 'all': {
                return queryResult;
            }
            case 'run': {
                break;
            }
        }
    }

}

