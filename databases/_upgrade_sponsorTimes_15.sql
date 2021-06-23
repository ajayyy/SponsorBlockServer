BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "unlistedVideos" (
	"videoID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL
);

UPDATE "config" SET value = 15 WHERE key = 'version';

COMMIT;
