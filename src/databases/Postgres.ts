import { Logger } from "../utils/logger";
import { IDatabase, QueryOption, QueryType } from "./IDatabase";
import { Client, Pool, QueryResult, types } from "pg";

import fs from "fs";
import { CustomPostgresConfig, CustomPostgresReadOnlyConfig } from "../types/config.model";
import { timeoutPomise, PromiseWithState, savePromiseState, nextFulfilment } from "../utils/promise";

// return numeric (pg_type oid=1700) as float
types.setTypeParser(1700, function(val) {
    return parseFloat(val);
});

// return int8 (pg_type oid=20) as int
types.setTypeParser(20, function(val) {
    return parseInt(val, 10);
});

export interface DatabaseConfig {
    dbSchemaFileName: string,
    dbSchemaFolder: string,
    fileNamePrefix: string,
    readOnly: boolean,
    createDbIfNotExists: boolean,
    postgres: CustomPostgresConfig,
    postgresReadOnly: CustomPostgresReadOnlyConfig
}

export class Postgres implements IDatabase {
    private pool: Pool;
    private lastPoolFail = 0;

    private poolRead: Pool;
    private lastPoolReadFail = 0;

    private concurrentRequests = 0;
    private concurrentReadRequests = 0;

    constructor(private config: DatabaseConfig) {}

    async init(): Promise<void> {
        this.pool = new Pool({
            ...this.config.postgres
        });
        this.pool.on("error", (err, client) => {
            Logger.error(err.stack);
            this.lastPoolFail = Date.now();

            try {
                client.release(true);
            } catch (err) {
                Logger.error(`pool (postgres): ${err}`);
            }
        });

        if (this.config.postgresReadOnly && this.config.postgresReadOnly.enabled) {
            this.poolRead = new Pool({
                ...this.config.postgresReadOnly
            });
            this.poolRead.on("error", (err, client) => {
                Logger.error(err.stack);
                this.lastPoolReadFail = Date.now();

                try {
                    client.release(true);
                } catch (err) {
                    Logger.error(`poolRead (postgres): ${err}`);
                }
            });
        }

        if (!this.config.readOnly) {
            if (this.config.createDbIfNotExists) {
                await this.createDB();
            }

            if (this.config.createDbIfNotExists && !this.config.readOnly && fs.existsSync(this.config.dbSchemaFileName)) {
                await this.pool.query(this.processUpgradeQuery(fs.readFileSync(this.config.dbSchemaFileName).toString()));
            }

            // Upgrade database if required
            await this.upgradeDB(this.config.fileNamePrefix, this.config.dbSchemaFolder);

            try {
                await this.applyIndexes(this.config.fileNamePrefix, this.config.dbSchemaFolder);
            } catch (e) {
                Logger.warn("Applying indexes failed. See https://github.com/ajayyy/SponsorBlockServer/wiki/Postgres-Extensions for more information.");
                Logger.warn(e as string);
            }
        }
    }

    async prepare(type: QueryType, query: string, params?: any[], options: QueryOption = {}): Promise<any[]> {
        // Convert query to use numbered parameters
        let count = 1;
        for (let char = 0; char < query.length; char++) {
            if (query.charAt(char) === "?") {
                query = `${query.slice(0, char)}$${count}${query.slice(char + 1)}`;
                count++;
            }
        }

        Logger.debug(`prepare (postgres): type: ${type}, query: ${query}, params: ${params}`);

        if (this.config.readOnly) {
            if (this.concurrentReadRequests > this.config.postgresReadOnly?.maxConcurrentRequests) {
                Logger.error(`prepare (postgres): cancelling read query because too many concurrent requests, query: ${query}`);
                throw new Error("Too many concurrent requests");
            }

            this.concurrentReadRequests++;
        } else {
            if (this.concurrentRequests > this.config.postgres.maxConcurrentRequests) {
                Logger.error(`prepare (postgres): cancelling query because too many concurrent requests, query: ${query}`);
                throw new Error("Too many concurrent requests");
            }

            this.concurrentRequests++;
        }

        const pendingQueries: PromiseWithState<QueryResult<any>>[] = [];
        let tries = 0;
        let lastPool: Pool = null;
        const maxTries = () => (lastPool === this.pool
            ? this.config.postgres.maxTries : this.config.postgresReadOnly.maxTries);
        do {
            tries++;

            try {
                lastPool = this.getPool(type, options);

                pendingQueries.push(savePromiseState(lastPool.query({ text: query, values: params })));
                const currentPromises = [...pendingQueries];
                if (options.useReplica && maxTries() - tries > 1) currentPromises.push(savePromiseState(timeoutPomise(this.config.postgresReadOnly.readTimeout)));
                const queryResult = await nextFulfilment(currentPromises);

                if (this.config.readOnly) {
                    this.concurrentReadRequests--;
                } else {
                    this.concurrentRequests--;
                }

                switch (type) {
                    case "get": {
                        const value = queryResult.rows[0];
                        Logger.debug(`result (postgres): ${JSON.stringify(value)}`);
                        return value;
                    }
                    case "all": {
                        const values = queryResult.rows;
                        Logger.debug(`result (postgres): ${JSON.stringify(values)}`);
                        return values;
                    }
                    case "run": {
                        return;
                    }
                }
            } catch (err) {
                if (lastPool === this.pool) {
                    // Only applies if it is get or all request
                    options.forceReplica = true;
                } else if (lastPool === this.poolRead && maxTries() - tries <= 1) {
                    options.useReplica = false;
                }

                Logger.error(`prepare (postgres) try ${tries}: ${err}`);
            }
        } while (this.isReadQuery(type) && tries < maxTries());

        if (this.config.readOnly) {
            this.concurrentReadRequests--;
        } else {
            this.concurrentRequests--;
        }

        throw new Error(`prepare (postgres): ${type} ${query} failed after ${tries} tries`);
    }

    private getPool(type: string, options: QueryOption): Pool {
        const readAvailable = this.poolRead && options.useReplica && this.isReadQuery(type);
        const ignroreReadDueToFailure = this.config.postgresReadOnly.fallbackOnFail
            && this.lastPoolReadFail > Date.now() - 1000 * 30;
        const readDueToFailure = this.config.postgresReadOnly.fallbackOnFail
            && this.lastPoolFail > Date.now() - 1000 * 30;
        if (readAvailable && !ignroreReadDueToFailure && (options.forceReplica || readDueToFailure ||
                Math.random() > 1 / (this.config.postgresReadOnly.weight + 1))) {
            return this.poolRead;
        } else {
            return this.pool;
        }
    }

    private isReadQuery(type: string): boolean {
        return type === "get" || type === "all";
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
                                CONNECTION LIMIT = -1;`
            );
        }

        client.end().catch(err => Logger.error(`closing db (postgres): ${err}`));
    }

    private async upgradeDB(fileNamePrefix: string, schemaFolder: string) {
        const versionCodeInfo = await this.pool.query("SELECT value FROM config WHERE key = 'version'");
        let versionCode = versionCodeInfo.rows[0] ? versionCodeInfo.rows[0].value : 0;

        let path = `${schemaFolder}/_upgrade_${fileNamePrefix}_${(parseInt(versionCode) + 1)}.sql`;
        Logger.debug(`db update: trying ${path}`);
        while (fs.existsSync(path)) {
            Logger.debug(`db update: updating ${path}`);
            await this.pool.query(this.processUpgradeQuery(fs.readFileSync(path).toString()));

            versionCode = (await this.pool.query("SELECT value FROM config WHERE key = 'version'"))?.rows[0]?.value;
            path = `${schemaFolder}/_upgrade_${fileNamePrefix}_${(parseInt(versionCode) + 1)}.sql`;
            Logger.debug(`db update: trying ${path}`);
        }
        Logger.debug(`db update: no file ${path}`);
    }

    private async applyIndexes(fileNamePrefix: string, schemaFolder: string) {
        const path = `${schemaFolder}/_${fileNamePrefix}_indexes.sql`;
        if (fs.existsSync(path)) {
            await this.pool.query(fs.readFileSync(path).toString());
        } else {
            Logger.debug(`failed to apply indexes to ${fileNamePrefix}`);
        }
    }

    private processUpgradeQuery(query: string): string {
        let result = query;
        result = result.replace(/sha256\((.*?)\)/gm, "encode(digest($1, 'sha256'), 'hex')");
        result = result.replace(/integer/gmi, "NUMERIC");

        return result;
    }
}
