import { config } from "./config";
import { initDb } from "./databases/databases";
import { createServer } from "./app";
import { Logger } from "./utils/logger";
import { startAllCrons } from "./cronjob";
import { getCommit } from "./utils/getCommit";
import { connectionPromise } from "./utils/redis";

async function init() {
    process.on("unhandledRejection", (error: any) => {
        // eslint-disable-next-line no-console
        console.dir(error?.stack);
        process.exit(1);
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

        // ignite cron job after server created
        startAllCrons();
    }).setTimeout(15000);
}

init().catch((err) => Logger.error(`Index.js: ${err}`));