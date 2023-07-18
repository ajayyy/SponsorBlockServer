BEGIN TRANSACTION;

ALTER TABLE "warnings" ADD "type" INTEGER default 0;

UPDATE "config" SET value = 36 WHERE key = 'version';

COMMIT;