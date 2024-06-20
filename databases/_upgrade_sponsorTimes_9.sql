BEGIN TRANSACTION;

/* Change 'videoDuration' field from INTEGER to REAL */
CREATE TABLE "sqlb_temp_table_9" (
	"videoID"	TEXT NOT NULL,
	"startTime"	REAL NOT NULL,
	"endTime"	REAL NOT NULL,
	"votes"	INTEGER NOT NULL,
	"locked" INTEGER NOT NULL default '0',
	"incorrectVotes" INTEGER NOT NULL default '1',
	"UUID"	TEXT NOT NULL UNIQUE,
	"userID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL,
	"views"	INTEGER NOT NULL,
	"category"	TEXT NOT NULL DEFAULT 'sponsor',
	"service"	TEXT NOT NULL DEFAULT 'YouTube',
	"videoDuration"	REAL NOT NULL DEFAULT '0',
	"shadowHidden"	INTEGER NOT NULL,
	"hashedVideoID" TEXT NOT NULL default ''
);

INSERT INTO sqlb_temp_table_9 SELECT "videoID","startTime","endTime","votes","locked","incorrectVotes","UUID","userID","timeSubmitted","views","category","service",'0', "shadowHidden","hashedVideoID" FROM "sponsorTimes";

DROP TABLE "sponsorTimes";
ALTER TABLE sqlb_temp_table_9 RENAME TO "sponsorTimes";

UPDATE "config" SET value = 9 WHERE key = 'version';

COMMIT;