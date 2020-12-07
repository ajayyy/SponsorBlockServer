import {Logger} from '../utils/logger';
import {IDatabase, QueryType} from './IDatabase';
// @ts-ignore
import MysqlInterface from 'sync-mysql';

export class Mysql implements IDatabase {
    private connection: any;

    constructor(private config: any) {
    }

    init() {
        this.connection = new MysqlInterface(this.config);
    }

    exec(query: string) {
        this.prepare('run', query, []);
    }

    prepare(type: QueryType, query: string, params: any[]) {
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

    public get<TModel>(query: string, params: any[]): TModel {
        return this.prepare('get', query, params);
    }

    public getAll<TModel>(query: string, params: any[]): TModel[] {
        return this.prepare('all', query, params);
    }

    public run(query: string, params: any[]): void {
        this.prepare('run', query, params);
    }
}

