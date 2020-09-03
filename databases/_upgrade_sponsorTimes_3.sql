BEGIN TRANSACTION;

/* Add hash field */
CREATE TABLE "sqlb_temp_table_3" (
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
	"shadowHidden"	INTEGER NOT NULL,
	"hashedVideoID"	TEXT NOT NULL 
);

/* hash upgade test sha256('vid') = '1ff838dc6ca9680d88455341118157d59a055fe6d0e3870f9c002847bebe4663' */
INSERT INTO sqlb_temp_table_3 SELECT *, sha256(videoID) FROM sponsorTimes;

DROP TABLE sponsorTimes;
ALTER TABLE sqlb_temp_table_3 RENAME TO "sponsorTimes";

/* Bump version in config */
UPDATE config SET value = 3 WHERE key = "version";

COMMIT;