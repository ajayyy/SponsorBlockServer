BEGIN TRANSACTION;

ALTER TABLE "casualVotes" DROP COLUMN "type";

UPDATE "config" SET value = 12 WHERE key = 'version';

COMMIT;