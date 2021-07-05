import { PoolConfig } from 'pg';
import * as redis from 'redis';
import { CacheOptions } from "@ajayyy/lru-diskcache";

export interface SBSConfig {
    [index: string]: any
    port: number;
    mockPort?: number;
    globalSalt: string;
    adminUserID: string;
    newLeafURLs?: string[];
    discordReportChannelWebhookURL?: string;
    discordFailedReportChannelWebhookURL?: string;
    discordFirstTimeSubmissionsWebhookURL?: string;
    discordCompletelyIncorrectReportWebhookURL?: string;
    neuralBlockURL?: string;
    discordNeuralBlockRejectWebhookURL?: string;
    userCounterURL?: string;
    proxySubmission?: string;
    behindProxy: string | boolean;
    db: string;
    privateDB: string;
    createDatabaseIfNotExist: boolean;
    schemaFolder: string;
    dbSchema: string;
    privateDBSchema: string;
    mode: string;
    readOnly: boolean;
    webhooks: WebhookConfig[];
    categoryList: string[];
    getTopUsersCacheTimeMinutes: number;
    maxNumberOfActiveWarnings: number;
    hoursAfterWarningExpires: number;
    rateLimit: {
        vote: RateLimitConfig;
        view: RateLimitConfig;
    };
    mysql?: any;
    privateMysql?: any;
    minimumPrefix?: string;
    maximumPrefix?: string;
    redis?: redis.ClientOpts;
    maxRewardTimePerSegmentInSeconds?: number;
    postgres?: PoolConfig;
    dumpDatabase?: DumpDatabase;
    diskCache: CacheOptions;
}

export interface WebhookConfig {
    url: string;
    key: string;
    scopes: string[];
}

export interface RateLimitConfig {
    windowMs: number;
    max: number;
    message: string;
    statusCode: number;
}

export interface PostgresConfig {
    dbSchemaFileName: string;
    dbSchemaFolder: string;
    fileNamePrefix: string;
    readOnly: boolean;
    createDbIfNotExists: boolean;
    enableWalCheckpointNumber: boolean;
    postgres: PoolConfig;
}

export interface DumpDatabase {
    enabled: boolean;
    minTimeBetweenMs: number;
    appExportPath: string;
    postgresExportPath: string;
    tables: DumpDatabaseTable[];
}

export interface DumpDatabaseTable {
    name: string;
    order?: string;
}
