BEGIN TRANSACTION;

-- vipUsers
ALTER TABLE "vipUsers" ADD "createdAt" INTEGER NOT NULL;

-- sponsorTimes
-- Don't create createdAt -> timeSubmitted field
ALTER TABLE "vipUsers" ADD "sponsorTimes" INTEGER NOT NULL;
COMMIT;