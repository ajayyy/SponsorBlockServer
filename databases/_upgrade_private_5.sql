BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "tempVipLog" (
	"issuerUserID"	TEXT NOT NULL,
	"targetUserID"	TEXT NOT NULL,
	"enabled"				BOOLEAN NOT NULL,
	"updatedAt"			INTEGER NOT NULL
);

UPDATE "config" SET value = 5 WHERE key = 'version';

COMMIT;