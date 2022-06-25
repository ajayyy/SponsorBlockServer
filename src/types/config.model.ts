import { PoolConfig } from "pg";
import * as redis from "redis";

interface RedisConfig extends redis.RedisClientOptions {
    enabled: boolean;
}

export interface CustomPostgresConfig extends PoolConfig {
    enabled: boolean;
}

export interface CustomPostgresReadOnlyConfig extends CustomPostgresConfig {
    weight: number;
}

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
    categorySupport: Record<string, string[]>;
    getTopUsersCacheTimeMinutes: number;
    maxNumberOfActiveWarnings: number;
    hoursAfterWarningExpires: number;
    rateLimit: {
        vote: RateLimitConfig;
        view: RateLimitConfig;
        rate: RateLimitConfig;
    };
    mysql?: any;
    privateMysql?: any;
    minimumPrefix?: string;
    maximumPrefix?: string;
    redis?: RedisConfig;
    maxRewardTimePerSegmentInSeconds?: number;
    postgres?: CustomPostgresConfig;
    postgresReadOnly?: CustomPostgresReadOnlyConfig;
    dumpDatabase?: DumpDatabase;
    diskCacheURL: string;
    crons: CronJobOptions;
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
    tables: DumpDatabaseTable[];
}

export interface DumpDatabaseTable {
    name: string;
    order?: string;
}

export interface CronJobDefault {
    schedule: string;
}

export interface CronJobOptions {
    enabled: boolean;
    downvoteSegmentArchive: CronJobDefault & DownvoteSegmentArchiveCron;
}

export interface DownvoteSegmentArchiveCron {
    voteThreshold: number;
    timeThresholdInDays: number;
}