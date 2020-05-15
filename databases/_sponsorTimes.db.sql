BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "vipUsers" (
	"userID"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "sponsorTimes" (
	"videoID"	TEXT NOT NULL,
	"startTime"	REAL NOT NULL,
	"endTime"	REAL NOT NULL,
	"votes"	INTEGER NOT NULL,
	"UUID"	TEXT NOT NULL UNIQUE,
	"userID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL,
	"views"	INTEGER NOT NULL,
    "category" TEXT NOT NULL,
	"shadowHidden"	INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "userNames" (
	"userID"	TEXT NOT NULL,
	"userName"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "categoryVotes" (
	"UUID"	TEXT NOT NULL,
	"category"	TEXT NOT NULL,
	"votes"	INTEGER NOT NULL default '0'
);

CREATE TABLE IF NOT EXISTS "config" (
    "key" TEXT NOT NULL UNIQUE,
	"value" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sponsorTimes_videoID on sponsorTimes(videoID);
CREATE INDEX IF NOT EXISTS sponsorTimes_UUID on sponsorTimes(UUID);

COMMIT;