BEGIN TRANSACTION;

/* Add locked field */
CREATE TABLE "sqlb_temp_table_13" (
	"userID"	TEXT NOT NULL,
	"userName"	TEXT NOT NULL,
	"locked" INTEGER NOT NULL default '0'
);

INSERT INTO sqlb_temp_table_13 SELECT "userID", "userName", 0 FROM "userNames";

DROP TABLE "userNames";
ALTER TABLE sqlb_temp_table_13 RENAME TO "userNames";

UPDATE "config" SET value = 13 WHERE key = 'version';

COMMIT;
