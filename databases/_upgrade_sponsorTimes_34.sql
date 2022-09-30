BEGIN TRANSACTION;

ALTER TABLE "videoInfo" DROP COLUMN "genreUrl";

UPDATE "config" SET value = 34 WHERE key = 'version';

COMMIT;