import {config} from "./config";
import {initDb} from './databases/databases';
import {createServer} from "./app";
import {Logger} from "./utils/logger";

initDb();
createServer(() => {
  Logger.info("Server started on port " + config.port + ".");
});
