BEGIN TRANSACTION;

ALTER TABLE "titleVotes" ADD "verification" INTEGER default 0;

UPDATE "config" SET value = 35 WHERE key = 'version';

COMMIT;