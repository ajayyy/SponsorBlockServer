BEGIN TRANSACTION;
DROP TABLE "shadowBannedUsers";
DROP TABLE "votes";
DROP TABLE "sponsorTimes";

CREATE TABLE IF NOT EXISTS "shadowBannedUsers" (
	"userID"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "votes" (
	"UUID"	TEXT NOT NULL,
	"userID"	INTEGER NOT NULL,
	"hashedIP"	INTEGER NOT NULL,
	"type"	INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "sponsorTimes" (
	"videoID"	TEXT NOT NULL,
	"hashedIP"	TEXT NOT NULL,
	"timeSubmitted"	INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sponsorTimes_hashedIP on sponsorTimes(hashedIP);
CREATE INDEX IF NOT EXISTS votes_userID on votes(UUID);
COMMIT;
