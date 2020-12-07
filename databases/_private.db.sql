BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "shadowBannedUsers" (
	"userID"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "votes" (
	"UUID"	TEXT NOT NULL,
	"userID"	TEXT NOT NULL,
	"hashedIP"	TEXT NOT NULL,
	"type"	INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "categoryVotes" (
	"UUID"	TEXT NOT NULL,
	"userID"	TEXT NOT NULL,
	"hashedIP"	TEXT NOT NULL,
	"category"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "sponsorTimes" (
	"videoID"	TEXT NOT NULL,
	"hashedIP"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "config" (
	"key" TEXT NOT NULL,
	"value" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sponsorTimes_hashedIP on sponsorTimes(hashedIP);
CREATE INDEX IF NOT EXISTS votes_userID on votes(UUID);

COMMIT;
