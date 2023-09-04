BEGIN TRANSACTION;

UPDATE "titleVotes" SET "shadowHidden" = 1
WHERE "UUID" IN (SELECT "UUID" FROM "titles" INNER JOIN "shadowBannedUsers" "bans" ON "titles"."userID" = "bans"."userID");

UPDATE "thumbnailVotes" SET "shadowHidden" = 1
WHERE "UUID" IN (SELECT "UUID" FROM "thumbnails" INNER JOIN "shadowBannedUsers" "bans" ON "thumbnails"."userID" = "bans"."userID");

UPDATE "config" SET value = 38 WHERE key = 'version';

COMMIT;
