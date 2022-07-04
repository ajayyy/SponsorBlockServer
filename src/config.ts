import fs from "fs";
import { SBSConfig } from "./types/config.model";
import packageJson from "../package.json";
import { isNumber } from "lodash";

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
    categoryList: ["sponsor", "selfpromo", "exclusive_access", "interaction", "intro", "outro", "preview", "music_offtopic", "filler", "poi_highlight"],
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
    maxNumberOfActiveWarnings: 1,
    hoursAfterWarningExpires: 16300000,
    adminUserID: "",
    discordCompletelyIncorrectReportWebhookURL: null,
    discordFirstTimeSubmissionsWebhookURL: null,
    discordNeuralBlockRejectWebhookURL: null,
    discordFailedReportChannelWebhookURL: null,
    discordReportChannelWebhookURL: null,
    discordMaliciousReportWebhookURL: null,
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
        },
        rate: {
            windowMs: 900000,
            max: 20,
            statusCode: 200,
            message: "Success",
        }
    },
    userCounterURL: null,
    newLeafURLs: null,
    maxRewardTimePerSegmentInSeconds: 600,
    poiMinimumStartTime: 2,
    postgres: {
        enabled: false,
        user: "",
        host: "",
        password: "",
        port: 5432
    },
    postgresReadOnly: {
        enabled: false,
        weight: 1,
        user: "",
        host: "",
        password: "",
        port: 5432
    },
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
        disableOfflineQueue: true
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
            if (isNumber(value)) {
                config[key] = parseInt(value, 10);
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