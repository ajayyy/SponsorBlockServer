import { config } from "./config.js";
import { initDb } from "./databases/databases.js";
import { createServer } from "./app.js";
import { Logger } from "./utils/logger.js";
import { getCommit } from "./utils/getCommit.js";
import { connectionPromise } from "./utils/redis.js";

async function init() {
    process.on("unhandledRejection", (error: any) => {
        // eslint-disable-next-line no-console
        console.dir(error?.stack);
    });

    process.on("uncaughtExceptions", (error: any) => {
        // eslint-disable-next-line no-console
        console.dir(error?.stack);
    });

    try {
        await initDb();
        await connectionPromise;
    } catch (e) {
        Logger.error(`Init Db: ${e}`);
        process.exit(1);
    }

    // edge case clause for creating compatible .db files, do not enable
    if (config.mode === "init-db-and-exit") process.exit(0);
    // do not enable init-db-only mode for usage.
    (global as any).HEADCOMMIT = config.mode === "development" ? "development"
        : config.mode === "test" ? "test"
            : getCommit() as string;
    createServer(() => {
        Logger.info(`Server started on port ${config.port}.`);
    }).setTimeout(15000);
}

init().catch((err) => Logger.error(`Index.js: ${err}`));
