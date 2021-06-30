import NodeEnvironment from 'jest-environment-node'
import {Config} from "@jest/types";
import {ImportMock} from "ts-mock-imports";
import * as rateLimitMiddlewareModule from "../src/middleware/requestRateLimit";
import rateLimit from "express-rate-limit";
import {config} from "../src/config";
import {initDb} from "../src/databases/databases";
import {Logger} from "../src/utils/logger";
import {createMockServer} from "./mocks";
import {createServer} from "../src/app";
import {Server} from "http";


export default class DbEnvironment extends NodeEnvironment {
    private server: Server
    private mockServer: Server

    constructor(config: Config.ProjectConfig) {
        super(config);
    }

    async setup() {
        await super.setup();
        ImportMock.mockFunction(rateLimitMiddlewareModule, 'rateLimitMiddleware', rateLimit({
            skip: () => {
                return true;
            }
        }));

        const {db, privateDB} = await initDb()
        this.global.db = db;
        this.global.privateDB = privateDB;

        const dbMode = config.mysql ? 'mysql'
            : config.postgres ? 'postgres'
                : 'sqlite'
        Logger.info('Database Mode: ' + dbMode);
        this.mockServer = await createMockServer()
        this.server = await createServer()
    }

    async teardown() {
        //for some reason it runs teardown multiple times, when setup hasn't been run yet so these can sometimes be undefined
        this.mockServer?.close();
        this.server?.close();

        ImportMock.restore()
        await super.teardown();
    }

    getVmContext() {
        return super.getVmContext();
    }
}
