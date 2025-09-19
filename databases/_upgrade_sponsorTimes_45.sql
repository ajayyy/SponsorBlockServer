BEGIN TRANSACTION;

ALTER TABLE "warnings" ADD "disableTime" INTEGER NULL;

UPDATE "config" SET value = 45 WHERE key = 'version';

COMMIT;
