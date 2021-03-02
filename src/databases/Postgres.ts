import { Logger } from '../utils/logger';
import { IDatabase, QueryType } from './IDatabase';
import { Pool } from 'pg';

import fs from "fs";

export class Mysql implements IDatabase {
    private pool: Pool;

    constructor(private config: any) {}

    init(): void {
        this.pool = new Pool();

        if (!this.config.readOnly) {
            // Upgrade database if required
            this.upgradeDB(this.config.fileNamePrefix, this.config.dbSchemaFolder);

            if (this.config.createDbIfNotExists && !this.config.readOnly && fs.existsSync(this.config.dbSchemaFileName)) {
                this.pool.query(this.processUpgradeQuery(fs.readFileSync(this.config.dbSchemaFileName).toString()));
            }
        }
    }

    async prepare(type: QueryType, query: string, params?: any[]) {
        Logger.debug(`prepare (postgres): type: ${type}, query: ${query}, params: ${params}`);

        // Convert query to use numbered parameters
        let count = 1;
        for (let char = 0; char < query.length; char++) {
            if (query.charAt(char) === '?') {
                query = query.slice(0, char) + "$" + count + query.slice(char + 1);
                count++;
            }
        }

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

    private async upgradeDB(fileNamePrefix: string, schemaFolder: string) {
        const versionCodeInfo = await this.pool.query("SELECT value FROM config WHERE key = 'version'");
        let versionCode = versionCodeInfo ? versionCodeInfo.rows[0].value : 0;

        let path = schemaFolder + "/_upgrade_" + fileNamePrefix + "_" + (parseInt(versionCode) + 1) + ".sql";
        Logger.debug('db update: trying ' + path);
        while (fs.existsSync(path)) {
            Logger.debug('db update: updating ' + path);
            await this.pool.query(this.processUpgradeQuery(fs.readFileSync(path).toString()));

            versionCode = (await this.pool.query("SELECT value FROM config WHERE key = 'version'"))?.rows[0]?.value;
            path = schemaFolder + "/_upgrade_" + fileNamePrefix + "_" + (parseInt(versionCode) + 1) + ".sql";
            Logger.debug('db update: trying ' + path);
        }
        Logger.debug('db update: no file ' + path);
    }

    private processUpgradeQuery(query: string): string {
        let result = query.replace(/sha256\((.*?)\)/gm, "digest($1, 'sha256')");

        return result;
    }
}
