BEGIN TRANSACTION;

ALTER TABLE "casualVotes" ADD "titleID" INTEGER default 0;

UPDATE "config" SET value = 13 WHERE key = 'version';

COMMIT;