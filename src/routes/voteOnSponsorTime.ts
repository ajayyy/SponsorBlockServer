import { Request, Response } from "express";
import { Logger } from "../utils/logger";
import { isUserVIP } from "../utils/isUserVIP";
import { isUserTempVIP } from "../utils/isUserTempVIP";
import { getMaxResThumbnail, YouTubeAPI } from "../utils/youtubeApi";
import { APIVideoInfo } from "../types/youtubeApi.model";
import { db, privateDB } from "../databases/databases";
import { dispatchEvent, getVoteAuthor, getVoteAuthorRaw } from "../utils/webhookUtils";
import { getFormattedTime } from "../utils/getFormattedTime";
import { getIP } from "../utils/getIP";
import { getHashCache } from "../utils/getHashCache";
import { config } from "../config";
import { UserID } from "../types/user.model";
import { DBSegment, Category, HashedIP, IPAddress, SegmentUUID, Service, VideoID, VideoIDHash, VideoDuration, ActionType, VoteType } from "../types/segments.model";
import { QueryCacher } from "../utils/queryCacher";
import axios from "axios";

const voteTypes = {
    normal: 0,
    incorrect: 1,
};

enum VoteWebhookType {
    Normal,
    Rejected
}

interface FinalResponse {
    blockVote: boolean,
    finalStatus: number
    finalMessage: string,
    webhookType: VoteWebhookType,
    webhookMessage: string
}

interface VoteData {
    UUID: string;
    nonAnonUserID: string;
    originalType: VoteType;
    voteTypeEnum: number;
    isTempVIP: boolean;
    isVIP: boolean;
    isOwnSubmission: boolean;
    row: {
        votes: number;
        views: number;
        locked: boolean;
    };
    category: string;
    incrementAmount: number;
    oldIncrementAmount: number;
    finalResponse: FinalResponse;
}

function getYouTubeVideoInfo(videoID: VideoID, ignoreCache = false): Promise<APIVideoInfo> {
    return config.newLeafURLs ? YouTubeAPI.listVideos(videoID, ignoreCache) : null;
}

const videoDurationChanged = (segmentDuration: number, APIDuration: number) => (APIDuration > 0 && Math.abs(segmentDuration - APIDuration) > 2);

async function updateSegmentVideoDuration(UUID: SegmentUUID) {
    const { videoDuration, videoID, service } = await db.prepare("get", `select "videoDuration", "videoID", "service" from "sponsorTimes" where "UUID" = ?`, [UUID]);
    let apiVideoInfo: APIVideoInfo = null;
    if (service == Service.YouTube) {
        // don't use cache since we have no information about the video length
        apiVideoInfo = await getYouTubeVideoInfo(videoID);
    }
    const apiVideoDuration = apiVideoInfo?.data?.lengthSeconds as VideoDuration;
    if (videoDurationChanged(videoDuration, apiVideoDuration)) {
        Logger.info(`Video duration changed for ${videoID} from ${videoDuration} to ${apiVideoDuration}`);
        await db.prepare("run", `UPDATE "sponsorTimes" SET "videoDuration" = ? WHERE "UUID" = ?`, [apiVideoDuration, UUID]);
    }
}

async function checkVideoDuration(UUID: SegmentUUID) {
    const { videoID, service } = await db.prepare("get", `select "videoID", "service" from "sponsorTimes" where "UUID" = ?`, [UUID]);
    let apiVideoInfo: APIVideoInfo = null;
    if (service == Service.YouTube) {
        // don't use cache since we have no information about the video length
        apiVideoInfo = await getYouTubeVideoInfo(videoID, true);
    }
    const apiVideoDuration = apiVideoInfo?.data?.lengthSeconds as VideoDuration;
    // if no videoDuration return early
    if (isNaN(apiVideoDuration)) return;
    // fetch latest submission
    const latestSubmission = await db.prepare("get", `SELECT "videoDuration", "UUID", "timeSubmitted"
        FROM "sponsorTimes"
        WHERE "videoID" = ? AND "service" = ? AND 
            "hidden" = 0 AND "shadowHidden" = 0 AND 
            "actionType" != 'full' AND
            "votes" > -2 AND "videoDuration" != 0
        ORDER BY "timeSubmitted" DESC LIMIT 1`,
    [videoID, service]) as {videoDuration: VideoDuration, UUID: SegmentUUID, timeSubmitted: number};

    if (latestSubmission && videoDurationChanged(latestSubmission.videoDuration, apiVideoDuration)) {
        Logger.info(`Video duration changed for ${videoID} from ${latestSubmission.videoDuration} to ${apiVideoDuration}`);
        await db.prepare("run", `UPDATE "sponsorTimes" SET "hidden" = 1
            WHERE "videoID" = ? AND "service" = ? AND "timeSubmitted" <= ?
            AND "hidden" = 0 AND "shadowHidden" = 0 AND 
            "actionType" != 'full' AND "votes" > -2`,
        [videoID, service, latestSubmission.timeSubmitted]);
    }
}

async function sendWebhooks(voteData: VoteData) {
    const submissionInfoRow = await db.prepare("get", `SELECT "s"."videoID", "s"."userID", s."startTime", s."endTime", s."category", u."userName",
        (select count(1) from "sponsorTimes" where "userID" = s."userID") count,
        (select count(1) from "sponsorTimes" where "userID" = s."userID" and votes <= -2) disregarded
        FROM "sponsorTimes" s left join "userNames" u on s."userID" = u."userID" where s."UUID"=?`,
    [voteData.UUID]);

    const userSubmissionCountRow = await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "sponsorTimes" WHERE "userID" = ?`, [voteData.nonAnonUserID]);

    if (submissionInfoRow !== undefined && userSubmissionCountRow != undefined) {
        let webhookURL: string = null;
        if (voteData.originalType === VoteType.Malicious) {
            webhookURL = config.discordMaliciousReportWebhookURL;
        } else if (voteData.voteTypeEnum === voteTypes.normal) {
            switch (voteData.finalResponse.webhookType) {
                case VoteWebhookType.Normal:
                    webhookURL = config.discordReportChannelWebhookURL;
                    break;
                case VoteWebhookType.Rejected:
                    webhookURL = config.discordFailedReportChannelWebhookURL;
                    break;
            }
        } else if (voteData.voteTypeEnum === voteTypes.incorrect) {
            webhookURL = config.discordCompletelyIncorrectReportWebhookURL;
        }

        if (config.newLeafURLs !== null) {
            const { err, data } = await YouTubeAPI.listVideos(submissionInfoRow.videoID);
            if (err) return;

            const isUpvote = voteData.incrementAmount > 0;
            // Send custom webhooks
            dispatchEvent(isUpvote ? "vote.up" : "vote.down", {
                "user": {
                    "status": getVoteAuthorRaw(userSubmissionCountRow.submissionCount, voteData.isTempVIP, voteData.isVIP, voteData.isOwnSubmission),
                },
                "video": {
                    "id": submissionInfoRow.videoID,
                    "title": data?.title,
                    "url": `https://www.youtube.com/watch?v=${submissionInfoRow.videoID}`,
                    "thumbnail": getMaxResThumbnail(data) || null,
                },
                "submission": {
                    "UUID": voteData.UUID,
                    "views": voteData.row.views,
                    "category": voteData.category,
                    "startTime": submissionInfoRow.startTime,
                    "endTime": submissionInfoRow.endTime,
                    "user": {
                        "UUID": submissionInfoRow.userID,
                        "username": submissionInfoRow.userName,
                        "submissions": {
                            "total": submissionInfoRow.count,
                            "ignored": submissionInfoRow.disregarded,
                        },
                    },
                },
                "votes": {
                    "before": voteData.row.votes,
                    "after": (voteData.row.votes + voteData.incrementAmount - voteData.oldIncrementAmount),
                },
            });

            // Send discord message
            if (webhookURL !== null && !isUpvote) {
                axios.post(webhookURL, {
                    "embeds": [{
                        "title": data?.title,
                        "url": `https://www.youtube.com/watch?v=${submissionInfoRow.videoID}&t=${(submissionInfoRow.startTime.toFixed(0) - 2)}s#requiredSegment=${voteData.UUID}`,
                        "description": `**${voteData.row.votes} Votes Prior | \
                            ${(voteData.row.votes + voteData.incrementAmount - voteData.oldIncrementAmount)} Votes Now | ${voteData.row.views} \
                            Views**\n\n**Locked**: ${voteData.row.locked}\n\n**Submission ID:** ${voteData.UUID}\
                            \n**Category:** ${submissionInfoRow.category}\
                            \n\n**Submitted by:** ${submissionInfoRow.userName}\n${submissionInfoRow.userID}\
                            \n\n**Total User Submissions:** ${submissionInfoRow.count}\
                            \n**Ignored User Submissions:** ${submissionInfoRow.disregarded}\
                            \n\n**Timestamp:** \
                            ${getFormattedTime(submissionInfoRow.startTime)} to ${getFormattedTime(submissionInfoRow.endTime)}`,
                        "color": 10813440,
                        "author": {
                            "name": voteData.finalResponse?.webhookMessage ??
                                    voteData.finalResponse?.finalMessage ??
                                    `${getVoteAuthor(userSubmissionCountRow.submissionCount, voteData.isTempVIP, voteData.isVIP, voteData.isOwnSubmission)}${voteData.row.locked ? " (Locked)" : ""}`,
                        },
                        "thumbnail": {
                            "url": getMaxResThumbnail(data) || "",
                        },
                    }],
                })
                    .then(res => {
                        if (res.status >= 400) {
                            Logger.error("Error sending reported submission Discord hook");
                            Logger.error(JSON.stringify((res.data)));
                            Logger.error("\n");
                        }
                    })
                    .catch(err => {
                        Logger.error("Failed to send reported submission Discord hook.");
                        Logger.error(JSON.stringify(err));
                        Logger.error("\n");
                    });
            }
        }
    }
}

async function categoryVote(UUID: SegmentUUID, userID: UserID, isVIP: boolean, isTempVIP: boolean, isOwnSubmission: boolean, category: Category
    , hashedIP: HashedIP, finalResponse: FinalResponse): Promise<{ status: number, message?: string }> {
    // Check if they've already made a vote
    const usersLastVoteInfo = await privateDB.prepare("get", `select count(*) as votes, category from "categoryVotes" where "UUID" = ? and "userID" = ? group by category`, [UUID, userID]);

    if (usersLastVoteInfo?.category === category) {
        // Double vote, ignore
        return { status: finalResponse.finalStatus };
    }

    const segmentInfo = (await db.prepare("get", `SELECT "category", "actionType", "videoID", "hashedVideoID", "service", "userID", "locked" FROM "sponsorTimes" WHERE "UUID" = ?`,
        [UUID])) as {category: Category, actionType: ActionType, videoID: VideoID, hashedVideoID: VideoIDHash, service: Service, userID: UserID, locked: number};

    if (segmentInfo.actionType === ActionType.Full) {
        return { status: 400, message: "Not allowed to change category of a full video segment" };
    }
    if (segmentInfo.actionType === ActionType.Poi || category === "poi_highlight") {
        return { status: 400, message: "Not allowed to change category for single point segments" };
    }
    if (!config.categoryList.includes(category)) {
        return { status: 400, message: "Category doesn't exist." };
    }

    // Ignore vote if the next category is locked
    const nextCategoryLocked = await db.prepare("get", `SELECT "videoID", "category" FROM "lockCategories" WHERE "videoID" = ? AND "service" = ? AND "category" = ?`, [segmentInfo.videoID, segmentInfo.service, category]);
    if (nextCategoryLocked && !isVIP) {
        return { status: 200 };
    }

    // Ignore vote if the segment is locked
    if (!isVIP && segmentInfo.locked === 1) {
        return { status: 200 };
    }

    const nextCategoryInfo = await db.prepare("get", `select votes from "categoryVotes" where "UUID" = ? and category = ?`, [UUID, category]);

    const timeSubmitted = Date.now();

    const voteAmount = (isVIP || isTempVIP) ? 500 : 1;
    const ableToVote = finalResponse.finalStatus === 200
                        && (await db.prepare("get", `SELECT "userID" FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID])) === undefined;

    if (ableToVote) {
        // Add the vote
        if ((await db.prepare("get", `select count(*) as count from "categoryVotes" where "UUID" = ? and category = ?`, [UUID, category])).count > 0) {
            // Update the already existing db entry
            await db.prepare("run", `update "categoryVotes" set "votes" = "votes" + ? where "UUID" = ? and "category" = ?`, [voteAmount, UUID, category]);
        } else {
            // Add a db entry
            await db.prepare("run", `insert into "categoryVotes" ("UUID", "category", "votes") values (?, ?, ?)`, [UUID, category, voteAmount]);
        }

        // Add the info into the private db
        if (usersLastVoteInfo?.votes > 0) {
            // Reverse the previous vote
            await db.prepare("run", `update "categoryVotes" set "votes" = "votes" - ? where "UUID" = ? and "category" = ?`, [voteAmount, UUID, usersLastVoteInfo.category]);

            await privateDB.prepare("run", `update "categoryVotes" set "category" = ?, "timeSubmitted" = ?, "hashedIP" = ? where "userID" = ? and "UUID" = ?`, [category, timeSubmitted, hashedIP, userID, UUID]);
        } else {
            await privateDB.prepare("run", `insert into "categoryVotes" ("UUID", "userID", "hashedIP", "category", "timeSubmitted") values (?, ?, ?, ?, ?)`, [UUID, userID, hashedIP, category, timeSubmitted]);
        }

        // See if the submissions category is ready to change
        const currentCategoryInfo = await db.prepare("get", `select votes from "categoryVotes" where "UUID" = ? and category = ?`, [UUID, segmentInfo.category]);

        const submissionInfo = await db.prepare("get", `SELECT "userID", "timeSubmitted", "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);
        const isSubmissionVIP = submissionInfo && await isUserVIP(submissionInfo.userID);
        const startingVotes = isSubmissionVIP ? 10000 : 1;

        // Change this value from 1 in the future to make it harder to change categories
        // Done this way without ORs incase the value is zero
        const currentCategoryCount = (currentCategoryInfo === undefined || currentCategoryInfo === null) ? startingVotes : currentCategoryInfo.votes;

        // Add submission as vote
        if (!currentCategoryInfo && submissionInfo) {
            await db.prepare("run", `insert into "categoryVotes" ("UUID", "category", "votes") values (?, ?, ?)`, [UUID, segmentInfo.category, currentCategoryCount]);
            await privateDB.prepare("run", `insert into "categoryVotes" ("UUID", "userID", "hashedIP", "category", "timeSubmitted") values (?, ?, ?, ?, ?)`, [UUID, submissionInfo.userID, "unknown", segmentInfo.category, submissionInfo.timeSubmitted]);
        }

        const nextCategoryCount = (nextCategoryInfo?.votes || 0) + voteAmount;

        //TODO: In the future, raise this number from zero to make it harder to change categories
        // VIPs change it every time
        if (nextCategoryCount - currentCategoryCount >= Math.max(Math.ceil(submissionInfo?.votes / 2), 2) || isVIP || isTempVIP || isOwnSubmission) {
            // Replace the category
            await db.prepare("run", `update "sponsorTimes" set "category" = ? where "UUID" = ?`, [category, UUID]);
        }
    }
    QueryCacher.clearSegmentCache(segmentInfo);
    return { status: finalResponse.finalStatus };
}

export function getUserID(req: Request): UserID {
    return req.query.userID as UserID;
}

export async function voteOnSponsorTime(req: Request, res: Response): Promise<Response> {
    const UUID = req.query.UUID as SegmentUUID;
    const paramUserID = getUserID(req);
    const type = req.query.type !== undefined ? parseInt(req.query.type as string) : undefined;
    const category = req.query.category as Category;
    const ip = getIP(req);

    const result = await vote(ip, UUID, paramUserID, type, category);

    const response = res.status(result.status);
    if (result.message) {
        return response.send(result.message);
    } else if (result.json) {
        return response.json(result.json);
    } else {
        return response.send();
    }
}

export async function vote(ip: IPAddress, UUID: SegmentUUID, paramUserID: UserID, type: number, category?: Category): Promise<{ status: number, message?: string, json?: unknown }> {
    // missing key parameters
    if (!UUID || !paramUserID || !(type !== undefined || category)) {
        return { status: 400 };
    }
    // Ignore this vote, invalid
    if (paramUserID.length < 30 && config.mode !== "test") {
        return { status: 200 };
    }

    const originalType = type;

    //hash the userID
    const nonAnonUserID = await getHashCache(paramUserID);
    const userID = await getHashCache(paramUserID + UUID);

    // To force a non 200, change this early
    const finalResponse: FinalResponse = {
        blockVote: false,
        finalStatus: 200,
        finalMessage: null,
        webhookType: VoteWebhookType.Normal,
        webhookMessage: null
    };

    //hash the ip 5000 times so no one can get it from the database
    const hashedIP: HashedIP = await getHashCache((ip + config.globalSalt) as IPAddress);

    const segmentInfo: DBSegment = await db.prepare("get", `SELECT * from "sponsorTimes" WHERE "UUID" = ?`, [UUID]);
    // segment doesnt exist
    if (!segmentInfo) {
        return { status: 404 };
    }

    const isTempVIP = await isUserTempVIP(nonAnonUserID, segmentInfo.videoID);
    const isVIP = await isUserVIP(nonAnonUserID);

    //check if user voting on own submission
    const isOwnSubmission = nonAnonUserID === segmentInfo.userID;

    // disallow vote types 10/11
    if (type === 10 || type === 11) {
        return { status: 400 };
    }

    const MILLISECONDS_IN_HOUR = 3600000;
    const now = Date.now();
    const warnings = (await db.prepare("all", `SELECT "reason" FROM warnings WHERE "userID" = ? AND "issueTime" > ? AND enabled = 1`,
        [nonAnonUserID, Math.floor(now - (config.hoursAfterWarningExpires * MILLISECONDS_IN_HOUR))],
    ));

    if (warnings.length >= config.maxNumberOfActiveWarnings) {
        const warningReason = warnings[0]?.reason;
        return { status: 403, message: "Vote rejected due to a warning from a moderator. This means that we noticed you were making some common mistakes that are not malicious, and we just want to clarify the rules. " +
                "Could you please send a message in Discord or Matrix so we can further help you?" +
                `${(warningReason.length > 0 ? ` Warning reason: '${warningReason}'` : "")}` };
    }

    // no type but has category, categoryVote
    if (!type && category) {
        return categoryVote(UUID, nonAnonUserID, isVIP, isTempVIP, isOwnSubmission, category, hashedIP, finalResponse);
    }

    // If not upvote, or an upvote on a dead segment (for ActionType.Full)
    if (!isVIP && (type != 1 || segmentInfo.votes <= -2)) {
        const isSegmentLocked = segmentInfo.locked;
        const isVideoLocked = async () => !!(await db.prepare("get", `SELECT "category" FROM "lockCategories" WHERE
                "videoID" = ? AND "service" = ? AND "category" = ? AND "actionType" = ?`,
        [segmentInfo.videoID, segmentInfo.service, segmentInfo.category, segmentInfo.actionType]));
        if (isSegmentLocked || await isVideoLocked()) {
            finalResponse.blockVote = true;
            finalResponse.webhookType = VoteWebhookType.Rejected;
            finalResponse.webhookMessage = "Vote rejected: A moderator has decided that this segment is correct";
        }
    }

    // if on downvoted non-full segment and is not VIP/ tempVIP/ submitter
    if (!isNaN(type) && segmentInfo.votes <= -2 && segmentInfo.actionType !== ActionType.Full &&
        !(isVIP || isTempVIP || isOwnSubmission)) {
        if (type == 1) {
            return { status: 403, message: "Not allowed to upvote segment with too many downvotes unless you are VIP." };
        } else if (type == 0) {
            // Already downvoted enough, ignore
            return { status: 200 };
        }
    }

    const voteTypeEnum = (type == 0 || type == 1 || type == 20) ? voteTypes.normal : voteTypes.incorrect;

    // no restrictions on checkDuration
    // check duration of all submissions on this video
    if (type <= 0) {
        checkVideoDuration(UUID);
    }

    try {
        // check if vote has already happened
        const votesRow = await privateDB.prepare("get", `SELECT "type" FROM "votes" WHERE "userID" = ? AND "UUID" = ?`, [userID, UUID]);

        // -1 for downvote, 1 for upvote. Maybe more depending on reputation in the future
        // oldIncrementAmount will be zero if row is null
        let incrementAmount = 0;
        let oldIncrementAmount = 0;

        if (type == VoteType.Upvote) {
            //upvote
            incrementAmount = 1;
        } else if (type === VoteType.Downvote || type === VoteType.Malicious) {
            //downvote
            incrementAmount = -1;
        } else if (type == VoteType.Undo) {
            //undo/cancel vote
            incrementAmount = 0;
        } else {
            //unrecongnised type of vote
            return { status: 400 };
        }
        if (votesRow) {
            if (votesRow.type === VoteType.Upvote) {
                oldIncrementAmount = 1;
            } else if (votesRow.type === VoteType.Downvote) {
                oldIncrementAmount = -1;
            } else if (votesRow.type === VoteType.ExtraDownvote) {
                oldIncrementAmount = -4;
            } else if (votesRow.type === VoteType.Undo) {
                oldIncrementAmount = 0;
            } else if (votesRow.type < 0) {
                //vip downvote
                oldIncrementAmount = votesRow.type;
            } else if (votesRow.type === 12) {
                // VIP downvote for completely incorrect
                oldIncrementAmount = -500;
            } else if (votesRow.type === 13) {
                // VIP upvote for completely incorrect
                oldIncrementAmount = 500;
            }
        }

        // check if the increment amount should be multiplied (downvotes have more power if there have been many views)
        // user is temp/ VIP/ own submission and downvoting
        if ((isVIP || isTempVIP || isOwnSubmission) && incrementAmount < 0) {
            incrementAmount = -(segmentInfo.votes + 2 - oldIncrementAmount);
            type = incrementAmount;
        }

        if (type === VoteType.Malicious) {
            incrementAmount = -Math.min(segmentInfo.votes + 2 - oldIncrementAmount, 5);
            type = incrementAmount;
        }

        // Only change the database if they have made a submission before and haven't voted recently
        const userAbleToVote = (!(isOwnSubmission && incrementAmount > 0 && oldIncrementAmount >= 0)
                && !(originalType === VoteType.Malicious && segmentInfo.actionType !== ActionType.Chapter)
                && !finalResponse.blockVote
                && finalResponse.finalStatus === 200
                && (await db.prepare("get", `SELECT "userID" FROM "sponsorTimes" WHERE "userID" = ?`, [nonAnonUserID])) !== undefined
                && (await db.prepare("get", `SELECT "userID" FROM "shadowBannedUsers" WHERE "userID" = ?`, [nonAnonUserID])) === undefined
                && (await privateDB.prepare("get", `SELECT "UUID" FROM "votes" WHERE "UUID" = ? AND "hashedIP" = ? AND "userID" != ?`, [UUID, hashedIP, userID])) === undefined);


        const ableToVote = isVIP || isTempVIP || userAbleToVote;

        if (ableToVote) {
            //update the votes table
            if (votesRow) {
                await privateDB.prepare("run", `UPDATE "votes" SET "type" = ?, "originalType" = ? WHERE "userID" = ? AND "UUID" = ?`, [type, originalType, userID, UUID]);
            } else {
                await privateDB.prepare("run", `INSERT INTO "votes" ("UUID", "userID", "hashedIP", "type", "normalUserID", "originalType") VALUES(?, ?, ?, ?, ?, ?)`, [UUID, userID, hashedIP, type, nonAnonUserID, originalType]);
            }

            // update the vote count on this sponsorTime
            await db.prepare("run", `UPDATE "sponsorTimes" SET "votes" = "votes" + ? WHERE "UUID" = ?`, [incrementAmount - oldIncrementAmount, UUID]);

            // tempVIP can bring back hidden segments
            if (isTempVIP && incrementAmount > 0 && voteTypeEnum === voteTypes.normal) {
                await db.prepare("run", `UPDATE "sponsorTimes" SET "hidden" = 0 WHERE "UUID" = ?`, [UUID]);
            }
            // additional processing for VIP
            // on VIP upvote
            if (isVIP && incrementAmount > 0 && voteTypeEnum === voteTypes.normal) {
                // Update video duration in case that caused it to be hidden
                await updateSegmentVideoDuration(UUID);
                // unhide & unlock
                await db.prepare("run", 'UPDATE "sponsorTimes" SET "locked" = 1, "hidden" = 0, "shadowHidden" = 0 WHERE "UUID" = ?', [UUID]);
            // on VIP downvote/ undovote, also unlock submission
            } else if (isVIP && incrementAmount <= 0 && voteTypeEnum === voteTypes.normal) {
                await db.prepare("run", 'UPDATE "sponsorTimes" SET "locked" = 0 WHERE "UUID" = ?', [UUID]);
            }

            QueryCacher.clearSegmentCache(segmentInfo);
        }
        if (incrementAmount - oldIncrementAmount !== 0) {
            sendWebhooks({
                UUID,
                nonAnonUserID,
                originalType,
                voteTypeEnum,
                isTempVIP,
                isVIP,
                isOwnSubmission,
                row: segmentInfo,
                category,
                incrementAmount,
                oldIncrementAmount,
                finalResponse
            });
        }
        return { status: finalResponse.finalStatus, message: finalResponse.finalMessage ?? undefined };
    } catch (err) {
        Logger.error(err as string);
        return { status: 500, message: finalResponse.finalMessage ?? undefined, json: { error: "Internal error creating segment vote" } };
    }
}
