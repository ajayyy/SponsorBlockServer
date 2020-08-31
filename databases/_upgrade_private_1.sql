BEGIN TRANSACTION;

/* for testing the db upgrade, don't remove because it looks empty */

/* Add version to config */
INSERT INTO config (key, value) VALUES("version", 1);

COMMIT;