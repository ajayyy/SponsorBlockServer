BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "shadowBannedUsers" (
	"userID"	TEXT NOT NULL
);

UPDATE "config" SET value = 14 WHERE key = 'version';

COMMIT;
