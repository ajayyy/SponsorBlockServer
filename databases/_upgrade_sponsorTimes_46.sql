BEGIN TRANSACTION;

ALTER TABLE "userNames" ADD "updateTime" INTEGER NULL;

UPDATE "config" SET value = 46 WHERE key = 'version';

COMMIT;
