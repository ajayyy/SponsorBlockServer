BEGIN TRANSACTION;

-- vipUsers
ALTER TABLE "vipUsers" ADD "createdAt" INTEGER NOT NULL;

-- sponsorTimes
-- Don't create createdAt -> timeSubmitted field
ALTER TABLE "sponsorTimes" ADD "updatedAt" INTEGER NOT NULL;

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
COMMIT;