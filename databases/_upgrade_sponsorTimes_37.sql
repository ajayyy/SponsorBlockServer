BEGIN TRANSACTION;

ALTER TABLE "titles" ADD UNIQUE ("videoID", "title"); --!sqlite-ignore

UPDATE "config" SET value = 37 WHERE key = 'version';

COMMIT;