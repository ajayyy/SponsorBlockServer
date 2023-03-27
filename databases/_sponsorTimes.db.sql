BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "vipUsers" (
	"userID"	TEXT NOT NULL
);

COMMIT;

BEGIN TRANSACTION;

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
	"votes"	INTEGER NOT NULL default 0
);

CREATE TABLE IF NOT EXISTS "shadowBannedIPs" (
	"hashedIP"	TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "config" (
	"key" TEXT NOT NULL UNIQUE,
	"value" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "titles" (
	"videoID"	TEXT NOT NULL,
	"title"	TEXT NOT NULL,
	"original" INTEGER default 0,
	"userID"	TEXT NOT NULL,
	"service"	TEXT NOT NULL,
	"hashedVideoID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL,
	"UUID"	TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "titleVotes" (
	"UUID"	TEXT NOT NULL PRIMARY KEY,
	"votes"	INTEGER NOT NULL default 0,
	"locked"	INTEGER NOT NULL default 0,
	"shadowHidden"	INTEGER NOT NULL default 0,
	FOREIGN KEY("UUID") REFERENCES "titles"("UUID")
);

CREATE TABLE IF NOT EXISTS "thumbnails" (
	"videoID"	TEXT NOT NULL,
	"original" INTEGER default 0,
	"userID"	TEXT NOT NULL,
	"service"	TEXT NOT NULL,
	"hashedVideoID"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL,
	"UUID"	TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "thumbnailTimestamps" (
	"UUID"	TEXT NOT NULL PRIMARY KEY,
	"timestamp"	INTEGER NOT NULL default 0,
	FOREIGN KEY("UUID") REFERENCES "thumbnails"("UUID")
);

CREATE TABLE IF NOT EXISTS "thumbnailVotes" (
	"UUID"	TEXT NOT NULL PRIMARY KEY,
	"votes"	INTEGER NOT NULL default 0,
	"locked"	INTEGER NOT NULL default 0,
	"shadowHidden"	INTEGER NOT NULL default 0,
	FOREIGN KEY("UUID") REFERENCES "thumbnails"("UUID")
);

CREATE EXTENSION IF NOT EXISTS pgcrypto; --!sqlite-ignore
CREATE EXTENSION IF NOT EXISTS pg_trgm; --!sqlite-ignore

COMMIT;