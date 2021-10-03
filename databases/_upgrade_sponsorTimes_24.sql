BEGIN TRANSACTION;

ALTER TABLE "lockCategories" ADD "service" TEXT NOT NULL default 'YouTube';

UPDATE "lockCategories" 
SET "service" = "sponsorTimes"."service" 
FROM "sponsorTimes" 
WHERE "lockCategories"."videoID" = "sponsorTimes"."videoID";

ALTER TABLE "unlistedVideos" ADD "service" TEXT NOT NULL default 'YouTube';

UPDATE "unlistedVideos" 
SET "service" = "sponsorTimes"."service" 
FROM "sponsorTimes"
WHERE "unlistedVideos"."videoID" = "sponsorTimes"."videoID";

DROP INDEX IF EXISTS "noSegments_videoID";

UPDATE "config" SET value = 24 WHERE key = 'version';

COMMIT;
