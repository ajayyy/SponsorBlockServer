import { Logger } from "../utils/logger";
import { config } from "../config";
import DownvoteSegmentArchiveJob from "./downvoteSegmentArchiveJob";

export function startAllCrons (): void {
  if (config?.crons?.enabled) {
    Logger.info("Crons started");

    DownvoteSegmentArchiveJob.start();
  } else {
    Logger.info("Crons dissabled");
  }
}
