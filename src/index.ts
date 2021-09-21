import { config } from "./config.js";
import { initDb } from "./databases/databases.js";
import { createServer } from "./app.js";
import { Logger } from "./utils/logger.js";
import { startAllCrons } from "./cronjob";
import { getCommit } from "./utils/getCommit.js";

async function init() {
    await initDb();
    (global as any).HEADCOMMIT = config.mode === "development" ? "development"
        : config.mode === "test" ? "test"
            : getCommit() as string;
    createServer(() => {
        Logger.info(`Server started on port ${config.port}.`);

        // ignite cron job after server created
        startAllCrons();
    });
}

init();