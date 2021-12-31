BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "ratings" (
	"videoID"		TEXT NOT NULL,
	"service"		TEXT NOT NULL default 'YouTube',
	"type"			INTEGER NOT NULL,
	"userID"		TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL,
	"hashedIP"		TEXT NOT NULL
);

UPDATE "config" SET value = 4 WHERE key = 'version';

COMMIT;