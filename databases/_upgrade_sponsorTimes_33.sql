BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "userFeatures" (
	"userID" TEXT NOT NULL,
	"feature" INTEGER NOT NULL,
    "issuerUserID" TEXT NOT NULL,
    "timeSubmitted" INTEGER NOT NULL,
    PRIMARY KEY ("userID", "feature")
);

UPDATE "config" SET value = 33 WHERE key = 'version';

COMMIT;