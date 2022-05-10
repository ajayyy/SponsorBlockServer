BEGIN TRANSACTION;

-- Add primary keys

ALTER TABLE "sponsorTimes" ADD PRIMARY KEY ("UUID");
ALTER TABLE "vipUsers" ADD PRIMARY KEY ("userID");
ALTER TABLE "userNames" ADD PRIMARY KEY ("userID");
ALTER TABLE "categoryVotes" ADD "id" SERIAL PRIMARY KEY;
ALTER TABLE "lockCategories" ADD "id" SERIAL PRIMARY KEY;
ALTER TABLE "warnings" ADD PRIMARY KEY ("userID", "issueTime");
ALTER TABLE "shadowBannedUsers" ADD PRIMARY KEY ("userID");
ALTER TABLE "unlistedVideos" ADD "id" SERIAL PRIMARY KEY;
ALTER TABLE "config" ADD PRIMARY KEY ("key");
ALTER TABLE "archivedSponsorTimes" ADD PRIMARY KEY ("UUID");
ALTER TABLE "ratings" ADD "id" SERIAL PRIMARY KEY;

UPDATE "config" SET value = 32 WHERE key = 'version';

COMMIT;