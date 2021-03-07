import { Logger } from '../utils/logger';
import { IDatabase, QueryType } from './IDatabase';
import { Client, Pool } from 'pg';

import fs from "fs";

export class Postgres implements IDatabase {
    private pool: Pool;

    constructor(private config: any) {}

    async init(): Promise<void> {
        this.pool = new Pool(this.config.postgres);

        if (!this.config.readOnly) {
            if (this.config.createDbIfNotExists) {
                await this.createDB();
            }

            if (this.config.createDbIfNotExists && !this.config.readOnly && fs.existsSync(this.config.dbSchemaFileName)) {
                await this.pool.query(this.processUpgradeQuery(fs.readFileSync(this.config.dbSchemaFileName).toString()));
            }

            // Upgrade database if required
            await this.upgradeDB(this.config.fileNamePrefix, this.config.dbSchemaFolder);
        }
    }

    async prepare(type: QueryType, query: string, params?: any[]) {
        // Convert query to use numbered parameters
        let count = 1;
        for (let char = 0; char < query.length; char++) {
            if (query.charAt(char) === '?') {
                query = query.slice(0, char) + "$" + count + query.slice(char + 1);
                count++;
            }
        }

        Logger.debug(`prepare (postgres): type: ${type}, query: ${query}, params: ${params}`);

        const queryResult = await this.pool.query({text: query, values: params});

        switch (type) {
            case 'get': {
                const value = queryResult.rows[0];
                Logger.debug(`result (postgres): ${JSON.stringify(value)}`);
                if (value) {
                    for (const [key, v] of Object.entries(value)) {
                        if (!isNaN(v as any)) {
                            value[key] = parseFloat(v as string)
                        }
                    }
                }

                Logger.debug(`result (postgres): ${value}`);
                return value;
            }
            case 'all': {
                let values = queryResult.rows;
                if (values) {
                    values = values.map((row) => {
                        for (const [key, v] of Object.entries(row)) {
                            if (!isNaN(v as any)) {
                                row[key] = parseFloat(v as string)
                            }
                        }

                        return row;
                    });
                }

                Logger.debug(`result (postgres): ${values}`);
                return values;
            }
            case 'run': {
                break;
            }
        }
    }

    private async createDB() {
        const client = new Client({
            ...this.config.postgres,
            database: "postgres"
        });

        await client.connect();
        
        if ((await client.query(`SELECT * FROM pg_database WHERE datname = '${this.config.postgres.database}'`)).rowCount == 0) {
            await client.query(`CREATE DATABASE "${this.config.postgres.database}"
                                WITH 
                                OWNER = ${this.config.postgres.user}
                                ENCODING = 'UTF8'
                                LC_COLLATE = 'en_US.utf8'
                                LC_CTYPE = 'en_US.utf8'
                                TABLESPACE = pg_default
                                CONNECTION LIMIT = -1;`
            );
        }

        client.end();
    }

    private async upgradeDB(fileNamePrefix: string, schemaFolder: string) {
        const versionCodeInfo = await this.pool.query("SELECT value FROM config WHERE key = 'version'");
        let versionCode = versionCodeInfo.rows[0] ? versionCodeInfo.rows[0].value : 0;

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
        let result = query;
        result = result.replace(/sha256\((.*?)\)/gm, "digest($1, 'sha256')");
        result = result.replace(/integer/gmi, "NUMERIC");

        return result;
    }
}

