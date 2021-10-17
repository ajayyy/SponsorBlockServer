-- sponsorTimes

CREATE INDEX IF NOT EXISTS "sponsorTime_timeSubmitted"
    ON public."sponsorTimes" USING btree
    ("timeSubmitted" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "sponsorTime_userID"
    ON public."sponsorTimes" USING btree
    ("userID" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "sponsorTimes_UUID"
    ON public."sponsorTimes" USING btree
    ("UUID" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "sponsorTimes_hashedVideoID_gin"
    ON public."sponsorTimes" USING gin
    ("hashedVideoID" COLLATE pg_catalog."default" gin_trgm_ops, category COLLATE pg_catalog."default" gin_trgm_ops)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "sponsorTimes_videoID"
    ON public."sponsorTimes" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, service COLLATE pg_catalog."default" ASC NULLS LAST, category COLLATE pg_catalog."default" ASC NULLS LAST, "timeSubmitted" ASC NULLS LAST)
    TABLESPACE pg_default;

-- userNames

CREATE INDEX IF NOT EXISTS "userNames_userID"
    ON public."userNames" USING btree
    ("userID" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- vipUsers

CREATE INDEX IF NOT EXISTS "vipUsers_index"
    ON public."vipUsers" USING btree
    ("userID" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- warnings

CREATE INDEX IF NOT EXISTS "warnings_index"
    ON public.warnings USING btree
    ("userID" COLLATE pg_catalog."default" ASC NULLS LAST, "issueTime" DESC NULLS LAST, enabled DESC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "warnings_issueTime"
    ON public.warnings USING btree
    ("issueTime" ASC NULLS LAST)
    TABLESPACE pg_default;

-- lockCategories

CREATE INDEX IF NOT EXISTS "lockCategories_videoID"
    ON public."lockCategories" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, service COLLATE pg_catalog."default" ASC NULLS LAST, category COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- categoryVotes

CREATE INDEX IF NOT EXISTS "categoryVotes_UUID_public"
    ON public."categoryVotes" USING btree
    ("UUID" COLLATE pg_catalog."default" ASC NULLS LAST, category COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- shadowBannedUsers

CREATE INDEX IF NOT EXISTS "shadowBannedUsers_index"
    ON public."shadowBannedUsers" USING btree
    ("userID" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- videoInfo
CREATE INDEX IF NOT EXISTS "videoInfo_videoID"
    ON public."videoInfo" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "videoInfo_channelID"
    ON public."videoInfo" USING btree
    ("channelID" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;