BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "licenseKeys" (
	"licenseKey"		TEXT NOT NULL PRIMARY KEY,
	"time"		        INTEGER NOT NULL,
	"type"			    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauthLicenseKeys" (
	"licenseKey"		TEXT NOT NULL PRIMARY KEY,
    "accessToken"		TEXT NOT NULL,
    "refreshToken"	    TEXT NOT NULL,
    "expiresIn"		    INTEGER NOT NULL
);

UPDATE "config" SET value = 11 WHERE key = 'version';

COMMIT;