import {config} from "./config";
import {initDb} from './databases/databases';
import {createServer} from "./app";
import {Logger} from "./utils/logger";

async function init() {
    await initDb();

    createServer(() => {
        Logger.info("Server started on port " + config.port + ".");
    });
}
 
init();