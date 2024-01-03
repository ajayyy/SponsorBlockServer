BEGIN TRANSACTION;

ALTER TABLE "titleVotes" ADD "downvotes" INTEGER default 0;
ALTER TABLE "titleVotes" ADD "removed" INTEGER default 0;

ALTER TABLE "thumbnailVotes" ADD "downvotes" INTEGER default 0;
ALTER TABLE "thumbnailVotes" ADD "removed" INTEGER default 0;

UPDATE "config" SET value = 39 WHERE key = 'version';

COMMIT;
