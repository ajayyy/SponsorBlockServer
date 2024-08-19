BEGIN TRANSACTION;

-- vipUsers
ALTER TABLE "vipUsers" ADD "createdAt" TEXT NOT NULL;

-- sponsorTimes
-- Don't create createdAt -> timeSubmitted field
ALTER TABLE "sponsorTimes" ADD "updatedAt" TEXT NOT NULL;

-- userNames
ALTER TABLE "userNames" ADD "createdAt" INTEGER NOT NULL;
ALTER TABLE "userNames" ADD "updatedAt" INTEGER NOT NULL;

-- categoryVotes
ALTER TABLE "categoryVotes" ADD "createdAt" INTEGER NOT NULL;
ALTER TABLE "categoryVotes" ADD "updatedAt" INTEGER NOT NULL;

-- lockCategories
ALTER TABLE "lockCategories" ADD "createdAt" INTEGER NOT NULL;
ALTER TABLE "lockCategories" ADD "updatedAt" INTEGER NOT NULL;

-- titleVotes
ALTER TABLE "titleVotes" ADD "createdAt" INTEGER NOT NULL;
ALTER TABLE "titleVotes" ADD "updatedAt" INTEGER NOT NULL;

-- thumbnailVotes
ALTER TABLE "thumbnailVotes" ADD "createdAt" INTEGER NOT NULL;
ALTER TABLE "thumbnailVotes" ADD "updatedAt" INTEGER NOT NULL;

UPDATE "config" SET value = 41 WHERE key = 'version';

COMMIT;