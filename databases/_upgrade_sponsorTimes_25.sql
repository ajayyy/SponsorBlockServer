BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "videoInfo" (
	"videoID"	TEXT PRIMARY KEY NOT NULL,
	"channelID"	TEXT NOT NULL,
	"title"	    TEXT NOT NULL,
	"published"	REAL NOT NULL,
	"genreUrl"	REAL NOT NULL
);

UPDATE "config" SET value = 25 WHERE key = 'version';

COMMIT;