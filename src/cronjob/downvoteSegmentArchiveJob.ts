import { CronJob } from "cron";

import { config as serverConfig } from "../config";
import { Logger } from "../utils/logger";
import { db } from "../databases/databases";
import { DBSegment } from "../types/segments.model";

const jobConfig = serverConfig?.crons?.downvoteSegmentArchive;

export const archiveDownvoteSegment = async (dayLimit: number, voteLimit: number, runTime?: number): Promise<number> => {
  const timeNow = runTime || new Date().getTime();
  const threshold = dayLimit * 86400000;

  Logger.info(`DownvoteSegmentArchiveJob starts at ${timeNow}`);
  try {
    // insert into archive sponsorTime
    await db.prepare(
      'run',
      `INSERT INTO "archivedSponsorTimes" 
        SELECT * 
        FROM "sponsorTimes" 
        WHERE "votes" < ? AND (? - "timeSubmitted") > ?`,
      [
        voteLimit,
        timeNow,
        threshold
      ]
    ) as DBSegment[];

  } catch (err) {
    Logger.error('Execption when insert segment in archivedSponsorTimes');
    Logger.error(err);
    return 1;
  }

  // remove from sponsorTime
  try {
    await db.prepare(
      'run', 
      'DELETE FROM "sponsorTimes" WHERE "votes" < ? AND (? - "timeSubmitted") > ?',
      [
        voteLimit,
        timeNow,
        threshold
      ]
    ) as DBSegment[];

  } catch (err) {
    Logger.error('Execption when deleting segment in sponsorTimes');
    Logger.error(err);
    return 1;
  }

  Logger.info('DownvoteSegmentArchiveJob finished');
  return 0;
};

const DownvoteSegmentArchiveJob = new CronJob(
  jobConfig?.schedule || new Date(1),
  () => archiveDownvoteSegment(jobConfig?.timeThresholdInDays, jobConfig?.voteThreshold)
);

export default DownvoteSegmentArchiveJob;
