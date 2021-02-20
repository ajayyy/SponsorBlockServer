import * as redis from 'redis';

export class SBSConfig {
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
    categoryList: CategoryConfig[];
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

    getCategoryLabel(categoryName: string) {
        return this.categoryList.find(cat => cat.name === categoryName)?.label;
    }

    isCategoryInConfig(categoryName: string) {
        return this.categoryList.find(cat => cat.name === categoryName) != null;
    }
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

export interface CategoryConfig {
    name: string;
    label: string;
}
