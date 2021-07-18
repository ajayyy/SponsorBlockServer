import {config} from "./config";
import {initDb} from "./databases/databases";
import {createServer} from "./app";
import {Logger} from "./utils/logger";
import {startAllCrons} from "./cronjob";

async function init() {
    await initDb();

    createServer(() => {
        Logger.info(`Server started on port ${config.port}.`);

        // ignite cron job after server created
        startAllCrons();
    });
}

init();