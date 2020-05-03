BEGIN TRANSACTION;

/* Add incorrectVotes field */
CREATE TABLE "sqlb_temp_table_1" (
	"videoID"	TEXT NOT NULL,
	"startTime"	REAL NOT NULL,
	"endTime"	REAL NOT NULL,
	"votes"	INTEGER NOT NULL,
    "incorrectVotes" INTEGER NOT NULL default '1',
	"UUID"	TEXT NOT NULL UNIQUE,
	"userID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL,
	"views"	INTEGER NOT NULL,
	"category"	TEXT NOT NULL DEFAULT "sponsor",
	"shadowHidden"	INTEGER NOT NULL
);
INSERT INTO sqlb_temp_table_1 SELECT videoID,startTime,endTime,votes,"1",UUID,userID,timeSubmitted,views,category,shadowHidden FROM sponsorTimes;

DROP TABLE sponsorTimes;
ALTER TABLE sqlb_temp_table_1 RENAME TO "sponsorTimes";

/* Add version to config */
INSERT INTO config (key, value) VALUES("version", 1);

COMMIT;