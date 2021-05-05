BEGIN TRANSACTION;

/* Rename table: noSegments to lockCategories */
ALTER TABLE "noSegments" RENAME TO "lockCategories";

UPDATE "config" SET value = 11 WHERE key = 'version';

COMMIT;
