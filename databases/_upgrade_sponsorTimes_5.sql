BEGIN TRANSACTION;

/* Add enabled field */
CREATE TABLE "sqlb_temp_table_5" (
	userID TEXT NOT NULL,
    issueTime INTEGER NOT NULL,
    issuerUserID TEXT NOT NULL,
    enabled INTEGER NOT NULL
);
INSERT INTO sqlb_temp_table_5 SELECT userID,issueTime,issuerUserID,1 FROM warnings;

DROP TABLE warnings;
ALTER TABLE sqlb_temp_table_5 RENAME TO "warnings";

UPDATE config SET value = 5 WHERE key = "version";

COMMIT;