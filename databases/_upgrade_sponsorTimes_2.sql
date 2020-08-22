BEGIN TRANSACTION;

/* Add new table: noSegments */
CREATE TABLE "noSegments" (
	"videoID"	TEXT NOT NULL,
	"userID"	TEXT NOT NULL,
	"category"	TEXT NOT NULL
);

/* Add version to config */
UPDATE config SET value = 2 WHERE key = 'version';

COMMIT;