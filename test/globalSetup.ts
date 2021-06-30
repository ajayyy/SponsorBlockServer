import {config} from "../src/config";
import * as fs from "fs";

export default function() {
    // delete old test database
    if (fs.existsSync(config.db)) fs.unlinkSync(config.db)
    if (fs.existsSync(config.privateDB)) fs.unlinkSync(config.privateDB);
}
