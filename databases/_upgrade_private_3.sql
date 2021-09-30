BEGIN TRANSACTION;

ALTER TABLE "sponsorTimes" ADD "service" TEXT NOT NULL default 'YouTube';
-- UPDATE "sponsorTimes" SET "service" = "YouTube";

DROP INDEX IF EXISTS "privateDB_sponsorTimes_videoID";

UPDATE "config" SET value = 3 WHERE key = 'version';

COMMIT;