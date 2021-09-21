import { config } from "./config";
import { initDb } from "./databases/databases";
import { createServer } from "./app";
import { Logger } from "./utils/logger";
import { startAllCrons } from "./cronjob";
import { getCommit } from "./utils/getCommit";

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