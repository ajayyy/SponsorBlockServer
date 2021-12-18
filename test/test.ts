import Mocha from "mocha";
import fs from "fs";
import path from "path";
import { config } from "../src/config";
import { createServer } from "../src/app";
import { createMockServer } from "./mocks";
import { createSpdyServer } from "./spdyServer";
import { Logger } from "../src/utils/logger";
import { initDb } from "../src/databases/databases";
import { ImportMock } from "ts-mock-imports";
import * as rateLimitMiddlewareModule from "../src/middleware/requestRateLimit";
import rateLimit from "express-rate-limit";

async function init() {
    ImportMock.mockFunction(rateLimitMiddlewareModule, "rateLimitMiddleware", rateLimit({
        skip: () => true
    }));

    // delete old test database
    if (fs.existsSync(config.db)) fs.unlinkSync(config.db);
    if (fs.existsSync(config.privateDB)) fs.unlinkSync(config.privateDB);

    await initDb();

    const dbMode = config.mysql ? "mysql"
        : config.postgres ? "postgres"
            : "sqlite";
    Logger.info(`Database Mode: ${dbMode}`);

    // set commit at headCommit
    (global as any).HEADCOMMIT = "test";

    // Instantiate a Mocha instance.
    const mocha = new Mocha();

    const testDirs = ["./test/cases", "./test/cases/ratings"];

    // Add each .ts file to the mocha instance
    testDirs.forEach(testDir => {
        fs.readdirSync(testDir)
            .filter((file) =>
                // Only keep the .ts files
                file.substr(-3) === ".ts"
            )
            .forEach(function(file) {
                mocha.addFile(
                    path.join(testDir, file)
                );
            });
    });
    const spdyServer = createSpdyServer(() => {
        Logger.info("Started spdy HTTP/2 Server");
        const mockServer = createMockServer(() => {
            Logger.info("Started mock HTTP Server");
            const server = createServer(() => {
                Logger.info("Started main HTTP server");
                // Run the tests.
                mocha.run((failures) => {
                    spdyServer.close();
                    mockServer.close();
                    server.close();
                    process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
                });
            });
        });
    });
}

init();