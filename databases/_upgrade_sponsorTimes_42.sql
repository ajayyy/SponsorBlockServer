BEGIN TRANSACTION;

ALTER TABLE "casualVotes" DROP COLUMN "downvotes";

UPDATE "config" SET value = 42 WHERE key = 'version';

COMMIT;
