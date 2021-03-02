import { Logger } from '../utils/logger';
import { IDatabase, QueryType } from './IDatabase';
import { Pool } from 'pg';

export class Mysql implements IDatabase {
    private pool: Pool;

    constructor(private config: any) {}

    init(): void {
        this.pool = new Pool();
    }

    async prepare(type: QueryType, query: string, params: any[]) {
        Logger.debug(`prepare (postgres): type: ${type}, query: ${query}, params: ${params}`);
        const queryResult = await this.pool.query(query, params);

        switch (type) {
            case 'get': {
                return queryResult.rows[0];
            }
            case 'all': {
                return queryResult.rows;
            }
            case 'run': {
                break;
            }
        }
    }
}

