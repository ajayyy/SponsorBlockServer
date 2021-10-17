BEGIN TRANSACTION;

CREATE TABLE "sqlb_temp_table_26" (
	"videoID"	TEXT PRIMARY KEY NOT NULL,
	"channelID"	TEXT NOT NULL,
	"title"	    TEXT NOT NULL,
	"published"	REAL NOT NULL,
	"genreUrl"	TEXT NOT NULL
);

INSERT INTO sqlb_temp_table_26 SELECT "videoID", "channelID", "title", "published", '' FROM "videoInfo";

DROP TABLE "videoInfo";
ALTER TABLE sqlb_temp_table_26 RENAME TO "videoInfo";

UPDATE "config" SET value = 26 WHERE key = 'version';

COMMIT;