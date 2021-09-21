import { Logger } from "../utils/logger.js";
import { config } from "../config.js";
import DownvoteSegmentArchiveJob from "./downvoteSegmentArchiveJob.js";

export function startAllCrons (): void {
    if (config?.crons?.enabled) {
        Logger.info("Crons started");

        DownvoteSegmentArchiveJob.start();
    } else {
        Logger.info("Crons dissabled");
    }
}
