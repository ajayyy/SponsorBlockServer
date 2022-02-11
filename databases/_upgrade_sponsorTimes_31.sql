BEGIN TRANSACTION;

/* START lockCategory migrations
no sponsor migrations
no selfpromo migrations */

/* exclusive_access migrations */
DELETE FROM "lockCategories" WHERE "category" = 'exclusive_access' AND "actionType" != 'full';
/* delete all full locks on categories without full */
DELETE FROM "lockCategories" WHERE "actionType" = 'full' AND "category" in ('interaction', 'intro', 'outro', 'preview', 'filler', 'music_offtopic', 'poi_highlight');
/* delete all non-skip music_offtopic locks */
DELETE FROM "lockCategories" WHERE "category" = 'music_offtopic' AND "actionType" != 'skip';
/* convert all poi_highlight to actionType poi */
UPDATE "lockCategories" SET "actionType" = 'poi' WHERE "category" = 'poi_highlight' AND "actionType" = 'skip';
/* delete all non-skip poi_highlight locks */
DELETE FROM "lockCategories" WHERE "category" = 'poi_highlight' AND "actionType" != 'poi';

/* END lockCategory migrations */

/* delete all redundant userName entries */
DELETE FROM "userNames" WHERE "userName" = "userID" AND "locked" = 0;

UPDATE "config" SET value = 31 WHERE key = 'version';

COMMIT;