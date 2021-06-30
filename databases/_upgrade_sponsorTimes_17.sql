BEGIN TRANSACTION;

/* Add reason field */
CREATE TABLE "sqlb_temp_table_17" (
	"userID" TEXT NOT NULL,
	"issueTime" INTEGER NOT NULL,
	"issuerUserID" TEXT NOT NULL,
	enabled INTEGER NOT NULL,
	"reason" TEXT NOT NULL default ''
);

INSERT INTO sqlb_temp_table_17 SELECT "userID","issueTime","issuerUserID","enabled", '' FROM "warnings";

DROP TABLE warnings;
ALTER TABLE sqlb_temp_table_17 RENAME TO "warnings";

UPDATE "config" SET value = 17 WHERE key = 'version';

COMMIT;