BEGIN TRANSACTION;

/* Add hash field */
ALTER TABLE "sponsorTimes" ADD "userAgent" TEXT NOT NULL default '';

ALTER TABLE "archivedSponsorTimes" ADD "userAgent" TEXT NOT NULL default '';

UPDATE "config" SET value = 22 WHERE key = 'version';

COMMIT;
