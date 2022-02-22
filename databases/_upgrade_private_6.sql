BEGIN TRANSACTION;

DROP INDEX IF EXISTS "sponsorTimes_hashedIP", "privateDB_sponsorTimes_videoID_v2"; --!sqlite-ignore

UPDATE "config" SET value = 6 WHERE key = 'version';

COMMIT;