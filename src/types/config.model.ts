import * as redis from 'redis';

export interface SBSConfig {
    port: number;
    mockPort?: number;
    globalSalt: string;
    adminUserID: string;
    youtubeAPIKey?: string;
    discordReportChannelWebhookURL?: string;
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
    getCategoryStatsCacheTimeMinutes: number;
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
