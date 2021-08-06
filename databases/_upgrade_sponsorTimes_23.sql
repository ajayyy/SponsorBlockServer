BEGIN TRANSACTION;

DELETE FROM "userNames" WHERE ctid NOT IN ( --!sqlite-ignore
    SELECT MIN(ctid) FROM "userNames"       --!sqlite-ignore
    GROUP BY "userID"                       --!sqlite-ignore
);                                          --!sqlite-ignore

ALTER TABLE "userNames" ADD UNIQUE("userID");   --!sqlite-ignore

UPDATE "config" SET value = 23 WHERE key = 'version';

COMMIT;
