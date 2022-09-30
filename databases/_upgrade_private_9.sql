BEGIN TRANSACTION;

-- Add primary keys

DROP INDEX IF EXISTS "privateDB_sponsorTimes_v3"; --!sqlite-ignore

UPDATE "config" SET value = 9 WHERE key = 'version';

COMMIT;