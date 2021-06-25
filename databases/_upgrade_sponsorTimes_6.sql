BEGIN TRANSACTION;

/* Add new voting field */
CREATE TABLE "sqlb_temp_table_6" (
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
	"shadowHidden"	INTEGER NOT NULL,
	"hashedVideoID" TEXT NOT NULL default ''
);

INSERT INTO sqlb_temp_table_6 SELECT "videoID","startTime","endTime","votes",'0',"incorrectVotes","UUID","userID","timeSubmitted","views","category","shadowHidden","hashedVideoID" FROM "sponsorTimes";

DROP TABLE "sponsorTimes";
ALTER TABLE sqlb_temp_table_6 RENAME TO "sponsorTimes";

UPDATE "config" SET value = 6 WHERE key = 'version';

COMMIT;