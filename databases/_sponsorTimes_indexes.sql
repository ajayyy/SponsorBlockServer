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

CREATE INDEX IF NOT EXISTS "sponsorTimes_hashedVideoID"
    ON public."sponsorTimes" USING btree
    (service COLLATE pg_catalog."default" ASC NULLS LAST, "hashedVideoID" text_pattern_ops ASC NULLS LAST, "startTime" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "sponsorTimes_videoID"
    ON public."sponsorTimes" USING btree
    (service COLLATE pg_catalog."default" ASC NULLS LAST, "videoID" COLLATE pg_catalog."default" ASC NULLS LAST, "startTime" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "sponsorTimes_videoID_category"
    ON public."sponsorTimes" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, "category" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "sponsorTimes_description_gin"
    ON public."sponsorTimes" USING gin
    ("description" COLLATE pg_catalog."default" gin_trgm_ops, category COLLATE pg_catalog."default" gin_trgm_ops)
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

-- ratings

CREATE INDEX IF NOT EXISTS "ratings_hashedVideoID_gin"
    ON public."ratings" USING gin
    ("hashedVideoID" COLLATE pg_catalog."default" gin_trgm_ops)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "ratings_hashedVideoID"
    ON public."ratings" USING btree
    ("hashedVideoID" COLLATE pg_catalog."default" ASC NULLS LAST, service COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "ratings_videoID"
    ON public."ratings" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, service COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

--- userFeatures

CREATE INDEX IF NOT EXISTS "userFeatures_userID"
    ON public."userFeatures" USING btree
    ("userID" COLLATE pg_catalog."default" ASC NULLS LAST, "feature" ASC NULLS LAST)
    TABLESPACE pg_default;

-- titles

CREATE INDEX IF NOT EXISTS "titles_timeSubmitted"
    ON public."titles" USING btree
    ("timeSubmitted" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "titles_userID_timeSubmitted"
    ON public."titles" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, "service" COLLATE pg_catalog."default" ASC NULLS LAST, "userID" COLLATE pg_catalog."default" DESC NULLS LAST, "timeSubmitted" DESC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "titles_videoID"
    ON public."titles" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, "service" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "titles_hashedVideoID"
    ON public."titles" USING btree
    ("hashedVideoID" COLLATE pg_catalog."default" ASC NULLS LAST, "service" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- titleVotes

CREATE INDEX IF NOT EXISTS "titleVotes_votes"
    ON public."titleVotes" USING btree
    ("UUID" COLLATE pg_catalog."default" ASC NULLS LAST, "votes" DESC NULLS LAST)
    TABLESPACE pg_default;

-- thumbnails

CREATE INDEX IF NOT EXISTS "thumbnails_timeSubmitted"
    ON public."thumbnails" USING btree
    ("timeSubmitted" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "thumbnails_votes_timeSubmitted"
    ON public."thumbnails" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, "service" COLLATE pg_catalog."default" ASC NULLS LAST, "userID" COLLATE pg_catalog."default" DESC NULLS LAST, "timeSubmitted" DESC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "thumbnails_videoID"
    ON public."thumbnails" USING btree
    ("videoID" COLLATE pg_catalog."default" ASC NULLS LAST, "service" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "thumbnails_hashedVideoID"
    ON public."thumbnails" USING btree
    ("hashedVideoID" COLLATE pg_catalog."default" ASC NULLS LAST, "service" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- thumbnailVotes

CREATE INDEX IF NOT EXISTS "thumbnailVotes_votes"
    ON public."thumbnailVotes" USING btree
    ("UUID" COLLATE pg_catalog."default" ASC NULLS LAST, "votes" DESC NULLS LAST)
    TABLESPACE pg_default;