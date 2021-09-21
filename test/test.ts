import Mocha from "mocha";
import fs from "fs";
import path from "path";
import { config } from "../src/config.js";
import { createServer } from "../src/app.js";
import { createMockServer } from "./mocks.js";
import { Logger } from "../src/utils/logger.js";
import { initDb } from "../src/databases/databases.js";
//import { ImportMock } from "ts-mock-imports";
import * as td from "testdouble";
//import * as rateLimitMiddlewareModule from "../src/middleware/requestRateLimit.js";
import rateLimit from "express-rate-limit";

async function init() {
    td.replaceEsm("../src/middleware/requestRateLimit.js", rateLimit({
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
    // super janked together by https://stackoverflow.com/a/59243202/15034732
    const global = (0,eval)("this");
    global.HEADCOMMIT = "test";

    // Instantiate a Mocha instance.
    const mocha = new Mocha();

    const testDir = "./test/cases";

    // Add each .ts file to the mocha instance
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

    const mockServer = createMockServer(() => {
        Logger.info("Started mock HTTP Server");
        const server = createServer(() => {
            Logger.info("Started main HTTP server");
            // Run the tests.
            mocha.run((failures) => {
                mockServer.close();
                server.close();
                process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
            });
        });
    });
}

init();