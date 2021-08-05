BEGIN TRANSACTION;

DELETE FROM "userNames" WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM "userNames"
    GROUP BY "userID"
);

ALTER TABLE "userNames" ADD UNIQUE("userID");

UPDATE "config" SET value = 23 WHERE key = 'version';

COMMIT;
