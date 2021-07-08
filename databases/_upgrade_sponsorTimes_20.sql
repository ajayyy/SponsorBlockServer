BEGIN TRANSACTION;

/* Add hash field */
ALTER TABLE "lockCategories" ADD "reason" TEXT NOT NULL default '';

UPDATE "config" SET value = 20 WHERE key = 'version';

COMMIT;
