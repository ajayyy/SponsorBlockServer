import {config} from "./src/config";
import {initDb} from './src/databases/databases';
import {createServer} from "./src/app";
import {Logger} from "./src/utils/logger";

initDb();
createServer(() => {
  Logger.info("Server started on port " + config.port + ".");
});
