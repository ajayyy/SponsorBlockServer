import { Logger } from "../utils/logger";
import { IDatabase, QueryOption, QueryType } from "./IDatabase";
import { Client, Pool, QueryResult, types } from "pg";

import fs from "fs";
import { CustomPostgresReadOnlyConfig, CustomWritePostgresConfig } from "../types/config.model";
import { timeoutPomise, PromiseWithState, savePromiseState, nextFulfilment } from "../utils/promise";

// return numeric (pg_type oid=1700) as float
types.setTypeParser(1700, function(val) {
    return parseFloat(val);
});

// return int8 (pg_type oid=20) as int
types.setTypeParser(20, function(val) {
    return parseInt(val, 10);
});

interface PostgresStats {
    activeRequests: number;
    avgReadTime: number;
    avgWriteTime: number;
    avgFailedTime: number;
    pool: {
        total: number;
        idle: number;
        waiting: number;
    }
}

export interface DatabaseConfig {
    dbSchemaFileName: string,
    dbSchemaFolder: string,
    fileNamePrefix: string,
    readOnly: boolean,
    createDbIfNotExists: boolean,
    postgres: CustomWritePostgresConfig,
    postgresReadOnly: CustomPostgresReadOnlyConfig
}

export class Postgres implements IDatabase {
    private pool: Pool;
    private lastPoolFail = 0;

    private poolRead: Pool;
    private lastPoolReadFail = 0;

    activePostgresRequests = 0;
    readResponseTime: number[] = [];
    writeResponseTime: number[] = [];
    failedResponseTime: number[] = [];
    maxStoredTimes = 200;

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
            try {
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
            } catch (e) {
                Logger.error(`poolRead (postgres): ${e}`);
            }
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

        if (this.config.postgres.maxActiveRequests && this.isReadQuery(type)
                && this.activePostgresRequests > this.config.postgres.maxActiveRequests) {
            throw new Error("Too many active postgres requests");
        }

        const start = Date.now();
        const pendingQueries: PromiseWithState<QueryResult<any>>[] = [];
        let tries = 0;
        let lastPool: Pool = null;
        const maxTries = () => (lastPool === this.pool
            ? this.config.postgres.maxTries : this.config.postgresReadOnly.maxTries);
        do {
            tries++;

            try {
                this.activePostgresRequests++;
                lastPool = this.getPool(type, options);

                pendingQueries.push(savePromiseState(lastPool.query({ text: query, values: params })));
                const currentPromises = [...pendingQueries];
                if (options.useReplica && maxTries() - tries > 1) currentPromises.push(savePromiseState(timeoutPomise(this.config.postgresReadOnly.readTimeout)));
                else if (this.config.postgres.timeout) currentPromises.push(savePromiseState(timeoutPomise(this.config.postgres.timeout)));
                const queryResult = await nextFulfilment(currentPromises);

                this.updateResponseTime(type, start);

                this.activePostgresRequests--;
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
                } else if (lastPool === this.poolRead) {
                    this.lastPoolReadFail = Date.now();

                    if (maxTries() - tries <= 1) {
                        options.useReplica = false;
                    }
                }

                this.updateResponseTime(type, start, this.failedResponseTime);
                this.activePostgresRequests--;
                Logger.error(`prepare (postgres) try ${tries}: ${err}`);
            }
        } while (this.isReadQuery(type) && tries < maxTries()
            && this.activePostgresRequests < this.config.postgresReadOnly.stopRetryThreshold);

        throw new Error(`prepare (postgres): ${type} ${query} failed after ${tries} tries`);
    }

    private getPool(type: string, options: QueryOption): Pool {
        const readAvailable = this.poolRead && options.useReplica && this.isReadQuery(type);
        const ignoreReadDueToFailure = this.config.postgresReadOnly.fallbackOnFail
            && this.lastPoolReadFail > Date.now() - 1000 * 30;
        const readDueToFailure = this.config.postgresReadOnly.fallbackOnFail
            && this.lastPoolFail > Date.now() - 1000 * 30;
        if (readAvailable && !ignoreReadDueToFailure && (options.forceReplica || readDueToFailure ||
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

    private updateResponseTime(type: string, start: number, customArray?: number[]): void {
        const responseTime = Date.now() - start;

        const array = customArray ?? (this.isReadQuery(type) ?
            this.readResponseTime : this.writeResponseTime);

        array.push(responseTime);
        if (array.length > this.maxStoredTimes) array.shift();
    }

    getStats(): PostgresStats {
        return {
            activeRequests: this.activePostgresRequests,
            avgReadTime: this.readResponseTime.length > 0 ? this.readResponseTime.reduce((a, b) => a + b, 0) / this.readResponseTime.length : 0,
            avgWriteTime: this.writeResponseTime.length > 0 ? this.writeResponseTime.reduce((a, b) => a + b, 0) / this.writeResponseTime.length : 0,
            avgFailedTime: this.failedResponseTime.length > 0 ? this.failedResponseTime.reduce((a, b) => a + b, 0) / this.failedResponseTime.length : 0,
            pool: {
                total: this.pool.totalCount,
                idle: this.pool.idleCount,
                waiting: this.pool.waitingCount
            }
        };
    }

    highLoad() {
        return this.activePostgresRequests > this.config.postgres.highLoadThreshold;
    }

    shouldUseRedisTimeout() {
        return this.activePostgresRequests < this.config.postgres.redisTimeoutThreshold;
    }
}
