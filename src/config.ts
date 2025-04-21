import fs from "fs";
import { SBSConfig } from "./types/config.model";
import packageJson from "../package.json";

const isTestMode = process.env.npm_lifecycle_script === packageJson.scripts.test;
const configFile = process.env.TEST_POSTGRES ? "ci.json"
    : isTestMode ? "test.json"
        : "config.json";
export const config: SBSConfig = JSON.parse(fs.readFileSync(configFile).toString("utf8"));

addDefaults(config, {
    port: 8080,
    behindProxy: "X-Forwarded-For",
    db: "./databases/sponsorTimes.db",
    privateDB: "./databases/private.db",
    createDatabaseIfNotExist: true,
    schemaFolder: "./databases",
    dbSchema: "./databases/_sponsorTimes.db.sql",
    privateDBSchema: "./databases/_private.db.sql",
    readOnly: false,
    webhooks: [],
    categoryList: ["sponsor", "selfpromo", "exclusive_access", "interaction", "intro", "outro", "preview", "music_offtopic", "filler", "poi_highlight", "chapter"],
    casualCategoryList: ["funny", "creative", "clever", "descriptive", "other"],
    categorySupport: {
        sponsor: ["skip", "mute", "full"],
        selfpromo: ["skip", "mute", "full"],
        exclusive_access: ["full"],
        interaction: ["skip", "mute"],
        intro: ["skip", "mute"],
        outro: ["skip", "mute"],
        preview: ["skip", "mute"],
        filler: ["skip", "mute"],
        music_offtopic: ["skip"],
        poi_highlight: ["poi"],
        chapter: ["chapter"]
    },
    deArrowTypes: ["title", "thumbnail"],
    maxTitleLength: 110,
    maxNumberOfActiveWarnings: 1,
    hoursAfterWarningExpires: 16300000,
    adminUserID: "",
    discordCompletelyIncorrectReportWebhookURL: null,
    discordFirstTimeSubmissionsWebhookURL: null,
    discordNeuralBlockRejectWebhookURL: null,
    discordFailedReportChannelWebhookURL: null,
    discordReportChannelWebhookURL: null,
    discordMaliciousReportWebhookURL: null,
    discordDeArrowLockedWebhookURL: null,
    discordDeArrowWarnedWebhookURL: null,
    discordNewUserWebhookURL: null,
    minReputationToSubmitChapter: 0,
    minReputationToSubmitFiller: 0,
    getTopUsersCacheTimeMinutes: 240,
    globalSalt: null,
    mode: "",
    neuralBlockURL: null,
    proxySubmission: null,
    rateLimit: {
        vote: {
            windowMs: 900000,
            max: 15,
            message: "OK",
            statusCode: 200,
        },
        view: {
            windowMs: 900000,
            max: 10,
            statusCode: 200,
            message: "OK",
        }
    },
    validityCheck: {
        userAgent: null,
    },
    userCounterURL: null,
    userCounterRatio: 10,
    newLeafURLs: null,
    maxRewardTimePerSegmentInSeconds: 600,
    poiMinimumStartTime: 2,
    postgres: {
        enabled: false,
        user: "",
        host: "",
        password: "",
        port: 5432,
        max: 10,
        idleTimeoutMillis: 10000,
        maxTries: 3,
        maxActiveRequests: 0,
        timeout: 60000,
        highLoadThreshold: 10,
        redisTimeoutThreshold: 1000
    },
    postgresReadOnly: {
        enabled: false,
        weight: 1,
        user: "",
        host: "",
        password: "",
        port: 5432,
        readTimeout: 250,
        max: 10,
        idleTimeoutMillis: 10000,
        maxTries: 3,
        fallbackOnFail: true,
        stopRetryThreshold: 800
    },
    postgresPrivateMax: 10,
    dumpDatabase: {
        enabled: false,
        minTimeBetweenMs: 180000,
        appExportPath: "./docker/database-export",
        tables: [{
            name: "sponsorTimes",
            order: "timeSubmitted"
        },
        {
            name: "userNames"
        },
        {
            name: "categoryVotes"
        },
        {
            name: "lockCategories",
        },
        {
            name: "warnings",
            order: "issueTime"
        },
        {
            name: "vipUsers"
        },
        {
            name: "unlistedVideos"
        },
        {
            name: "videoInfo"
        },
        {
            name: "ratings"
        },
        {
            name: "titles"
        },
        {
            name: "titleVotes"
        },
        {
            name: "thumbnails"
        },
        {
            name: "thumbnailTimestamps"
        },
        {
            name: "thumbnailVotes"
        },
        {
            name: "casualVotes",
            order: "timeSubmitted"
        },
        {
            name: "casualVoteTitles"
        }]
    },
    diskCacheURL: null,
    crons: null,
    redis: {
        enabled: false,
        socket: {
            host: "",
            port: 0
        },
        disableOfflineQueue: true,
        expiryTime: 24 * 60 * 60,
        getTimeout: 40,
        maxConnections: 15000,
        maxWriteConnections: 1000,
        commandsQueueMaxLength: 3000,
        stopWritingAfterResponseTime: 50,
        responseTimePause: 1000,
        maxReadResponseTime: 500,
        disableHashCache: false,
        clientCacheSize: 2000,
        useCompression: false,
        dragonflyMode: false
    },
    redisRead: {
        enabled: false,
        socket: {
            host: "",
            port: 0
        },
        disableOfflineQueue: true,
        weight: 1
    },
    redisRateLimit: true,
    patreon: {
        clientId: "",
        clientSecret: "",
        minPrice: 0,
        redirectUri: "https://sponsor.ajay.app/api/generateToken/patreon"
    },
    gumroad: {
        productPermalinks: ["sponsorblock"]
    },
    tokenSeed: "",
    minUserIDLength: 30,
    deArrowPaywall: false,
    useCacheForSegmentGroups: false,
    maxConnections: 100,
    maxResponseTime: 1000,
    maxResponseTimeWhileLoadingCache: 2000,
    etagExpiry: 5000,
    youTubeKeys: {
        visitorData: null,
        poToken: null,
        floatieUrl: null,
        floatieAuth: null
    }
});
loadFromEnv(config);
migrate(config);

// Add defaults
function addDefaults(config: SBSConfig, defaults: SBSConfig) {
    for (const key in defaults) {
        if (!Object.prototype.hasOwnProperty.call(config, key)) {
            config[key] = defaults[key];
        }
    }
}

function migrate(config: SBSConfig) {
    // Redis change
    if (config.redis) {
        const redisConfig = config.redis as any;
        if (redisConfig.host || redisConfig.port) {
            config.redis.socket = {
                host: redisConfig.host,
                port: redisConfig.port
            };
        }

        if (redisConfig.enable_offline_queue !== undefined) {
            config.disableOfflineQueue = !redisConfig.enable_offline_queue;
        }

        if (redisConfig.socket?.host && redisConfig.enabled === undefined) {
            redisConfig.enabled = true;
        }
    }

    if (config.postgres && config.postgres.user && config.postgres.enabled === undefined) {
        config.postgres.enabled = true;
    }
}

function loadFromEnv(config: SBSConfig, prefix = "") {
    for (const key in config) {
        const fullKey = (prefix ? `${prefix}_` : "") + key;
        const data = config[key];

        if (data && typeof data === "object" && !Array.isArray(data)) {
            loadFromEnv(data, fullKey);
        } else if (process.env[fullKey]) {
            const value = process.env[fullKey];
            if (value !== "" && !isNaN(value as unknown as number)) {
                config[key] = parseFloat(value);
            } else if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
                config[key] = value === "true";
            } else if (key === "newLeafURLs") {
                config[key] = [value];
            } else {
                config[key] = value;
            }
        }
    }
}