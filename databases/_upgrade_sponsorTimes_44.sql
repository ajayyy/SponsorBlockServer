BEGIN TRANSACTION;

ALTER TABLE "titles" ADD "userAgent" TEXT NOT NULL default '';
ALTER TABLE "thumbnails" ADD "userAgent" TEXT NOT NULL default '';

UPDATE "config" SET value = 44 WHERE key = 'version';

COMMIT;
