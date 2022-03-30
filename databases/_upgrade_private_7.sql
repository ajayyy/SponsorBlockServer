BEGIN TRANSACTION;

ALTER TABLE "votes" ADD "normalUserID" TEXT NOT NULL default '';

UPDATE "config" SET value = 7 WHERE key = 'version';

COMMIT;