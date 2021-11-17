BEGIN TRANSACTION;

ALTER TABLE "sponsorTimes" ADD "description" TEXT NOT NULL default '';
ALTER TABLE "archivedSponsorTimes" ADD "description" TEXT NOT NULL default '';

UPDATE "config" SET value = 27 WHERE key = 'version';

COMMIT;