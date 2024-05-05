BEGIN TRANSACTION;

DROP INDEX IF EXISTS "titles_hashedVideoID";
DROP INDEX IF EXISTS "thumbnails_hashedVideoID";

UPDATE "config" SET value = 40 WHERE key = 'version';

COMMIT;
