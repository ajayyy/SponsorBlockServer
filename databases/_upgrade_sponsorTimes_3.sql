BEGIN TRANSACTION;

/* hash upgrade test sha256('vid') = '1ff838dc6ca9680d88455341118157d59a055fe6d0e3870f9c002847bebe4663' */
/* Add hash field */
ALTER TABLE "sponsorTimes" ADD "hashedVideoID" TEXT NOT NULL default '';
UPDATE "sponsorTimes" SET "hashedVideoID" = sha256("videoID");

/* Bump version in config */
UPDATE "config" SET value = 3 WHERE key = 'version';

COMMIT;