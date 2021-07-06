BEGIN TRANSACTION;

/* Add hash field */
ALTER TABLE "lockCategories" ADD "hashedVideoID" TEXT NOT NULL default '';
UPDATE "lockCategories" SET "hashedVideoID" = sha256("videoID");

UPDATE "config" SET value = 18 WHERE key = 'version';

COMMIT;
