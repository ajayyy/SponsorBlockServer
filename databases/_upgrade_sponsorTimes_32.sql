BEGIN TRANSACTION;

-- Add primary keys

ALTER TABLE "sponsorTimes" ADD PRIMARY KEY ("UUID"); --!sqlite-ignore
ALTER TABLE "vipUsers" ADD PRIMARY KEY ("userID"); --!sqlite-ignore
ALTER TABLE "userNames" ADD PRIMARY KEY ("userID"); --!sqlite-ignore
ALTER TABLE "categoryVotes" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "lockCategories" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "warnings" ADD PRIMARY KEY ("userID", "issueTime"); --!sqlite-ignore
ALTER TABLE "shadowBannedUsers" ADD PRIMARY KEY ("userID"); --!sqlite-ignore
ALTER TABLE "unlistedVideos" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore
ALTER TABLE "config" ADD PRIMARY KEY ("key"); --!sqlite-ignore
ALTER TABLE "archivedSponsorTimes" ADD PRIMARY KEY ("UUID"); --!sqlite-ignore
ALTER TABLE "ratings" ADD "id" SERIAL PRIMARY KEY; --!sqlite-ignore

UPDATE "config" SET value = 32 WHERE key = 'version';

COMMIT;