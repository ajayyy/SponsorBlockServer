BEGIN TRANSACTION;

ALTER TABLE "titles" ADD "casualMode" INTEGER default 0;
ALTER TABLE "thumbnails" ADD "casualMode" INTEGER default 0;

UPDATE "config" SET value = 41 WHERE key = 'version';

COMMIT;
