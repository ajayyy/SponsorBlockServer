BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "userNameLogs" (
	"userID"	TEXT NOT NULL,
	"newUserName"	TEXT NOT NULL,
	"oldUserName"	TEXT NOT NULL,
	"updatedByAdmin"	BOOLEAN NOT NULL,
	"updatedAt"	INTEGER NOT NULL
);

UPDATE "config" SET value = 2 WHERE key = 'version';

COMMIT;