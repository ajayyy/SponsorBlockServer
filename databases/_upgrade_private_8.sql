BEGIN TRANSACTION;

-- Add primary keys

ALTER TABLE "userNameLogs" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "categoryVotes" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "sponsorTimes" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "config" ADD PRIMARY KEY ("key"); --!sqlite-ignore
ALTER TABLE "ratings" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "tempVipLog" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "votes" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore

UPDATE "config" SET value = 8 WHERE key = 'version';

COMMIT;