BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "ratings" (
	"videoID"	    TEXT NOT NULL,
	"service"	    TEXT NOT NULL default 'YouTube',
	"type"	        INTEGER NOT NULL,
	"count"	        INTEGER NOT NULL,
	"hashedVideoID"	TEXT NOT NULL
);

UPDATE "config" SET value = 28 WHERE key = 'version';

COMMIT;