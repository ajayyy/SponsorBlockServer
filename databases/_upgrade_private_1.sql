BEGIN TRANSACTION;

/* Add version to config */
INSERT INTO config (key, value) VALUES("version", 1);

COMMIT;