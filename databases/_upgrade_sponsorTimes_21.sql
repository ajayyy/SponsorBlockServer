BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "archivedSponsorTimes" (
	"videoID" TEXT NOT NULL,
	"startTime" REAL NOT NULL,
	"endTime" REAL NOT NULL,
	"votes" INTEGER NOT NULL,
	"locked" INTEGER NOT NULL DEFAULT '0',
	"incorrectVotes" INTEGER NOT NULL DEFAULT 1,
	"UUID" TEXT NOT NULL UNIQUE,
	"userID" TEXT NOT NULL,
	"timeSubmitted" INTEGER NOT NULL,
	"views" INTEGER NOT NULL,
	"category" TEXT NOT NULL DEFAULT 'sponsor',
	"service" TEXT NOT NULL DEFAULT 'Youtube',
	"actionType" TEXT NOT NULL DEFAULT 'skip',
	"videoDuration" INTEGER NOT NULL DEFAULT '0',
	"hidden" INTEGER NOT NULL DEFAULT '0',
	"reputation" REAL NOT NULL DEFAULT '0',
	"shadowHidden" INTEGER NOT NULL,
	"hashedVideoID" TEXT NOT NULL DEFAULT ''
);

UPDATE "config" SET value = 21 WHERE key = 'version';

COMMIT;
