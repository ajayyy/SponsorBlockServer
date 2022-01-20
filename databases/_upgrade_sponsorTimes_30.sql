BEGIN TRANSACTION;

UPDATE "sponsorTimes" SET "actionType" = 'poi' WHERE "category" = 'poi_highlight';

UPDATE "config" SET value = 30 WHERE key = 'version';

COMMIT;