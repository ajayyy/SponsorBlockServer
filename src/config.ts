import fs from 'fs';
import {SBSConfig} from "./types/config.model";

export const config: SBSConfig = new SBSConfig();

setFromJson();
setDefaults();

function setFromJson() {
    const isTestMode = process.env.npm_lifecycle_script === 'ts-node test/test.ts';
    const configFile = isTestMode ? 'test.json' : 'config.json';
    setConfig(config, JSON.parse(fs.readFileSync(configFile).toString('utf8')));
}

function setDefaults() {
    setConfig(config, {
        port: 80,
        behindProxy: "X-Forwarded-For",
        db: "./databases/sponsorTimes.db",
        privateDB: "./databases/private.db",
        createDatabaseIfNotExist: true,
        schemaFolder: "./databases",
        dbSchema: "./databases/_sponsorTimes.db.sql",
        privateDBSchema: "./databases/_private.db.sql",
        readOnly: false,
        webhooks: [],
        categoryList: [
            { name: "sponsor", label: "Sponsor" },
            { name: "intro", label: "Intro" },
            { name: "outro", label: "Outro" },
            { name: "interaction", label: "Interaction" },
            { name: "selfpromo", label: "Self Promotion" },
            { name: "music_offtopic", label: "Non-Music Section" }
        ],
        maxNumberOfActiveWarnings: 3,
        hoursAfterWarningExpires: 24,
        adminUserID: "",
        discordCompletelyIncorrectReportWebhookURL: "",
        discordFirstTimeSubmissionsWebhookURL: "",
        discordNeuralBlockRejectWebhookURL: "",
        discordReportChannelWebhookURL: "",
        getTopUsersCacheTimeMinutes: 0,
        getCategoryStatsCacheTimeMinutes: 0,
        globalSalt: null,
        mode: "",
        neuralBlockURL: null,
        proxySubmission: null,
        rateLimit: {
            vote: {
                windowMs: 900000,
                max: 20,
                message: "Too many votes, please try again later",
                statusCode: 429,
            },
            view: {
                windowMs: 900000,
                max: 20,
                statusCode: 200,
                message: "Too many views, please try again later",
            },
        },
        userCounterURL: null,
        youtubeAPIKey: null,
    } as SBSConfig);
}

function setConfig(config: SBSConfig, defaults: SBSConfig) {
    for (const key in defaults) {
        if (!config.hasOwnProperty(key)) {
            // @ts-ignore
            config[key] = defaults[key];
        }
    }
}
