BEGIN TRANSACTION;

/* Create warnings table */
CREATE TABLE "warnings" (
    "userID" TEXT NOT NULL,
    "issueTime" INTEGER NOT NULL,
    "issuerUserID" TEXT NOT NULL
);

UPDATE "config" SET value = 4 WHERE key = 'version';

COMMIT;