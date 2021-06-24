BEGIN TRANSACTION;

DROP TABLE "unlistedVideos";

CREATE TABLE IF NOT EXISTS "unlistedVideos" (
	"videoID"	TEXT NOT NULL,
	"year"	TEXT NOT NULL,
	"views"	TEXT NOT NULL,
	"channelID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL
);

UPDATE "config" SET value = 16 WHERE key = 'version';

COMMIT;
