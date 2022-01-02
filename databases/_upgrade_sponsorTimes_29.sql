BEGIN TRANSACTION;

CREATE TABLE "sqlb_temp_table_29" (
	"videoID"		TEXT NOT NULL,
	"userID"		TEXT NOT NULL,
	"actionType"	TEXT NOT NULL DEFAULT 'skip',
	"category"		TEXT NOT NULL,
	"hashedVideoID" TEXT NOT NULL default '',
	"reason" 		TEXT NOT NULL default '',
	"service"		TEXT NOT NULL default 'YouTube'
);

INSERT INTO sqlb_temp_table_29 SELECT "videoID","userID",'skip',"category","hashedVideoID","reason","service" FROM "lockCategories";
INSERT INTO sqlb_temp_table_29 SELECT "videoID","userID",'mute',"category","hashedVideoID","reason","service" FROM "lockCategories";

DROP TABLE "lockCategories";
ALTER TABLE sqlb_temp_table_29 RENAME TO "lockCategories";

UPDATE "config" SET value = 29 WHERE key = 'version';

COMMIT;