import {ImportMock} from "ts-mock-imports";
import * as rateLimitMiddlewareModule from "../src/middleware/requestRateLimit";
import rateLimit from "express-rate-limit";
import fs from "fs";
import {config} from "../src/config";
import {initDb} from "../src/databases/databases";
import {createMockServer} from "./mocks";
import {Logger} from "../src/utils/logger";
import {createServer} from "../src/app";

(async () => {
    ImportMock.mockFunction(rateLimitMiddlewareModule, 'rateLimitMiddleware', rateLimit({
        skip: () => {
            return true;
        }
    }));

    // delete old test database
    if (fs.existsSync(config.db)) fs.unlinkSync(config.db)
    if (fs.existsSync(config.privateDB)) fs.unlinkSync(config.privateDB);

    await initDb();
    return new Promise(res => {
        (global as any).mockServer = createMockServer(() => {
                Logger.info("Started mock HTTP Server");
            (global as any).server = createServer(() => {
                    Logger.info("Started main HTTP server");
                    res()
                });
            })
        }
    )
})()
