BEGIN TRANSACTION;

-- Add primary keys

ALTER TABLE "votes" ADD "originalType" INTEGER NOT NULL default -1;

UPDATE "config" SET value = 10 WHERE key = 'version';

COMMIT;