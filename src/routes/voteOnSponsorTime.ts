import {Request, Response} from "express";
import {Logger} from "../utils/logger";
import {isUserVIP} from "../utils/isUserVIP";
import {getMaxResThumbnail, YouTubeAPI} from "../utils/youtubeApi";
import {db, privateDB} from "../databases/databases";
import {dispatchEvent, getVoteAuthor, getVoteAuthorRaw} from "../utils/webhookUtils";
import {getFormattedTime} from "../utils/getFormattedTime";
import {getIP} from "../utils/getIP";
import {getHash} from "../utils/getHash";
import {config} from "../config";
import { UserID } from "../types/user.model";
import { Category, CategoryActionType, HashedIP, IPAddress, SegmentUUID, Service, VideoID, VideoIDHash, Visibility } from "../types/segments.model";
import { getCategoryActionType } from "../utils/categoryInfo";
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
    voteTypeEnum: number;
    isVIP: boolean;
    isOwnSubmission: boolean;
    row: {
        votes: number;
        views: number;
    };
    category: string;
    incrementAmount: number;
    oldIncrementAmount: number;
    finalResponse: FinalResponse;
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
        if (voteData.voteTypeEnum === voteTypes.normal) {
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
                    "status": getVoteAuthorRaw(userSubmissionCountRow.submissionCount, voteData.isVIP, voteData.isOwnSubmission),
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
                        "url": `https://www.youtube.com/watch?v=${submissionInfoRow.videoID}&t=${(submissionInfoRow.startTime.toFixed(0) - 2)}`,
                        "description": `**${voteData.row.votes} Votes Prior | \
                            ${(voteData.row.votes + voteData.incrementAmount - voteData.oldIncrementAmount)} Votes Now | ${voteData.row.views} \
                            Views**\n\n**Submission ID:** ${voteData.UUID}\
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
                                    getVoteAuthor(userSubmissionCountRow.submissionCount, voteData.isVIP, voteData.isOwnSubmission),
                        },
                        "thumbnail": {
                            "url": getMaxResThumbnail(data) || "",
                        },
                    }],
                })
                    .then(async res => {
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

async function categoryVote(UUID: SegmentUUID, userID: UserID, isVIP: boolean, isOwnSubmission: boolean, category: Category
    , hashedIP: HashedIP, finalResponse: FinalResponse, res: Response): Promise<Response> {
    // Check if they've already made a vote
    const usersLastVoteInfo = await privateDB.prepare("get", `select count(*) as votes, category from "categoryVotes" where "UUID" = ? and "userID" = ? group by category`, [UUID, userID]);

    if (usersLastVoteInfo?.category === category) {
        // Double vote, ignore
        return res.sendStatus(finalResponse.finalStatus);
    }

    const videoInfo = (await db.prepare("get", `SELECT "category", "videoID", "hashedVideoID", "service", "userID" FROM "sponsorTimes" WHERE "UUID" = ?`,
        [UUID])) as {category: Category, videoID: VideoID, hashedVideoID: VideoIDHash, service: Service, userID: UserID};
    if (!videoInfo) {
        // Submission doesn't exist
        return res.status(400).send("Submission doesn't exist.");
    }

    if (!config.categoryList.includes(category)) {
        return res.status(400).send("Category doesn't exist.");
    }
    if (getCategoryActionType(category) !== CategoryActionType.Skippable) {
        return res.status(400).send("Cannot vote for this category");
    }

    const nextCategoryInfo = await db.prepare("get", `select votes from "categoryVotes" where "UUID" = ? and category = ?`, [UUID, category]);

    const timeSubmitted = Date.now();

    const voteAmount = isVIP ? 500 : 1;
    const ableToVote = isVIP || finalResponse.finalStatus === 200 || true;

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
        const currentCategoryInfo = await db.prepare("get", `select votes from "categoryVotes" where "UUID" = ? and category = ?`, [UUID, videoInfo.category]);

        const submissionInfo = await db.prepare("get", `SELECT "userID", "timeSubmitted", "votes" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);
        const isSubmissionVIP = submissionInfo && await isUserVIP(submissionInfo.userID);
        const startingVotes = isSubmissionVIP ? 10000 : 1;

        // Change this value from 1 in the future to make it harder to change categories
        // Done this way without ORs incase the value is zero
        const currentCategoryCount = (currentCategoryInfo === undefined || currentCategoryInfo === null) ? startingVotes : currentCategoryInfo.votes;

        // Add submission as vote
        if (!currentCategoryInfo && submissionInfo) {
            await db.prepare("run", `insert into "categoryVotes" ("UUID", "category", "votes") values (?, ?, ?)`, [UUID, videoInfo.category, currentCategoryCount]);

            await privateDB.prepare("run", `insert into "categoryVotes" ("UUID", "userID", "hashedIP", "category", "timeSubmitted") values (?, ?, ?, ?, ?)`, [UUID, submissionInfo.userID, "unknown", videoInfo.category, submissionInfo.timeSubmitted]);
        }

        const nextCategoryCount = (nextCategoryInfo?.votes || 0) + voteAmount;

        //TODO: In the future, raise this number from zero to make it harder to change categories
        // VIPs change it every time
        if (nextCategoryCount - currentCategoryCount >= Math.max(Math.ceil(submissionInfo?.votes / 2), 2) || isVIP || isOwnSubmission) {
            // Replace the category
            await db.prepare("run", `update "sponsorTimes" set "category" = ? where "UUID" = ?`, [category, UUID]);
        }
    }

    QueryCacher.clearVideoCache(videoInfo);

    return res.sendStatus(finalResponse.finalStatus);
}

export function getUserID(req: Request): UserID {
    return req.query.userID as UserID;
}

export async function voteOnSponsorTime(req: Request, res: Response): Promise<Response> {
    const UUID = req.query.UUID as SegmentUUID;
    const paramUserID = getUserID(req);
    let type = req.query.type !== undefined ? parseInt(req.query.type as string) : undefined;
    const category = req.query.category as Category;

    if (UUID === undefined || paramUserID === undefined || (type === undefined && category === undefined)) {
        //invalid request
        return res.sendStatus(400);
    }
    if (paramUserID.length < 30 && config.mode !== "test") {
        // Ignore this vote, invalid
        return res.sendStatus(200);
    }

    //hash the userID
    const nonAnonUserID = getHash(paramUserID);
    const userID = getHash(paramUserID + UUID);

    // To force a non 200, change this early
    const finalResponse: FinalResponse = {
        blockVote: false,
        finalStatus: 200,
        finalMessage: null,
        webhookType: VoteWebhookType.Normal,
        webhookMessage: null
    };

    //x-forwarded-for if this server is behind a proxy
    const ip = getIP(req);

    //hash the ip 5000 times so no one can get it from the database
    const hashedIP: HashedIP = getHash((ip + config.globalSalt) as IPAddress);

    //check if this user is on the vip list
    const isVIP = await isUserVIP(nonAnonUserID);

    //check if user voting on own submission
    const isOwnSubmission = (await db.prepare("get", `SELECT "UUID" as "submissionCount" FROM "sponsorTimes" where "userID" = ? AND "UUID" = ?`, [nonAnonUserID, UUID])) !== undefined;

    // disallow vote types 10/11
    if (type === 10 || type === 11) {
        // no longer allow type 10/11 alternative votes
        return res.sendStatus(400);
    }

    // If not upvote
    if (!isVIP && type != 1) {
        const isSegmentLocked = async () => !!(await db.prepare("get", `SELECT "locked" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]))?.locked;
        const isVideoLocked = async () => !!(await db.prepare("get", `SELECT "lockCategories".category from "lockCategories" left join "sponsorTimes"
            on ("lockCategories"."videoID" = "sponsorTimes"."videoID" and "lockCategories".category = "sponsorTimes".category)
            where "UUID" = ?`, [UUID]));

        if (await isSegmentLocked() || await isVideoLocked()) {
            finalResponse.blockVote = true;
            finalResponse.webhookType = VoteWebhookType.Rejected;
            finalResponse.webhookMessage = "Vote rejected: A moderator has decided that this segment is correct";
        }
    }

    if (type === undefined && category !== undefined) {
        return categoryVote(UUID, nonAnonUserID, isVIP, isOwnSubmission, category, hashedIP, finalResponse, res);
    }

    if (type !== undefined && !isVIP && !isOwnSubmission) {
        // Check if upvoting hidden segment
        const voteInfo = await db.prepare("get", `SELECT votes FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);

        if (voteInfo && voteInfo.votes <= -2) {
            if (type == 1) {
                return res.status(403).send("Not allowed to upvote segment with too many downvotes unless you are VIP.");
            } else if (type == 0) {
                // Already downvoted enough, ignore
                return res.sendStatus(200);
            }
        }
    }

    const MILLISECONDS_IN_HOUR = 3600000;
    const now = Date.now();
    const warnings = (await db.prepare("all", `SELECT "reason" FROM warnings WHERE "userID" = ? AND "issueTime" > ? AND enabled = 1`,
        [nonAnonUserID, Math.floor(now - (config.hoursAfterWarningExpires * MILLISECONDS_IN_HOUR))],
    ));

    if (warnings.length >= config.maxNumberOfActiveWarnings) {
        return res.status(403).send("Vote rejected due to a warning from a moderator. This means that we noticed you were making some common mistakes that are not malicious, and we just want to clarify the rules. " +
                                    "Could you please send a message in Discord or Matrix so we can further help you?" +
                                    `${(warnings[0]?.reason?.length > 0 ? ` Warning reason: '${warnings[0].reason}'` : "")}`);
    }

    const voteTypeEnum = (type == 0 || type == 1 || type == 20) ? voteTypes.normal : voteTypes.incorrect;

    try {
        //check if vote has already happened
        const votesRow = await privateDB.prepare("get", `SELECT "type" FROM "votes" WHERE "userID" = ? AND "UUID" = ?`, [userID, UUID]);

        //-1 for downvote, 1 for upvote. Maybe more depending on reputation in the future
        let incrementAmount = 0;
        let oldIncrementAmount = 0;

        if (type == 1) {
            //upvote
            incrementAmount = 1;
        } else if (type == 0) {
            //downvote
            incrementAmount = -1;
        } else if (type == 20) {
            //undo/cancel vote
            incrementAmount = 0;
        } else {
            //unrecongnised type of vote
            return res.sendStatus(400);
        }
        if (votesRow != undefined) {
            if (votesRow.type === 1) {
                //upvote
                oldIncrementAmount = 1;
            } else if (votesRow.type === 0) {
                //downvote
                oldIncrementAmount = -1;
            } else if (votesRow.type === 2) {
                //extra downvote
                oldIncrementAmount = -4;
            } else if (votesRow.type === 20) {
                //undo/cancel vote
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

        //check if the increment amount should be multiplied (downvotes have more power if there have been many views)
        const videoInfo = await db.prepare("get", `SELECT "videoID", "hashedVideoID", "service", "votes", "views", "userID", "hidden" FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]) as
                        {videoID: VideoID, hashedVideoID: VideoIDHash, service: Service, votes: number, views: number, userID: UserID, hidden: Visibility};

        if (voteTypeEnum === voteTypes.normal) {
            if ((isVIP || isOwnSubmission) && incrementAmount < 0) {
                //this user is a vip and a downvote
                incrementAmount = -(videoInfo.votes + 2 - oldIncrementAmount);
                type = incrementAmount;
            }
        } else if (voteTypeEnum == voteTypes.incorrect) {
            if (isVIP || isOwnSubmission) {
                //this user is a vip and a downvote
                incrementAmount = 500 * incrementAmount;
                type = incrementAmount < 0 ? 12 : 13;
            }
        }

        // Only change the database if they have made a submission before and haven't voted recently
        const ableToVote = isVIP
            || (!(isOwnSubmission && incrementAmount > 0)
                && (await db.prepare("get", `SELECT "userID" FROM "sponsorTimes" WHERE "userID" = ?`, [nonAnonUserID])) !== undefined
                && (await db.prepare("get", `SELECT "userID" FROM "shadowBannedUsers" WHERE "userID" = ?`, [nonAnonUserID])) === undefined
                && (await privateDB.prepare("get", `SELECT "UUID" FROM "votes" WHERE "UUID" = ? AND "hashedIP" = ? AND "userID" != ?`, [UUID, hashedIP, userID])) === undefined)
                && !finalResponse.blockVote
                && finalResponse.finalStatus === 200;

        if (ableToVote) {
            //update the votes table
            if (votesRow != undefined) {
                await privateDB.prepare("run", `UPDATE "votes" SET "type" = ? WHERE "userID" = ? AND "UUID" = ?`, [type, userID, UUID]);
            } else {
                await privateDB.prepare("run", `INSERT INTO "votes" VALUES(?, ?, ?, ?)`, [UUID, userID, hashedIP, type]);
            }

            let columnName = "";
            if (voteTypeEnum === voteTypes.normal) {
                columnName = "votes";
            } else if (voteTypeEnum === voteTypes.incorrect) {
                columnName = "incorrectVotes";
            }

            //update the vote count on this sponsorTime
            //oldIncrementAmount will be zero is row is null
            await db.prepare("run", `UPDATE "sponsorTimes" SET "${columnName}" = "${columnName}" + ? WHERE "UUID" = ?`, [incrementAmount - oldIncrementAmount, UUID]);
            if (isVIP && incrementAmount > 0 && voteTypeEnum === voteTypes.normal) {
                // Unide and Lock this submission
                await db.prepare("run", 'UPDATE "sponsorTimes" SET locked = 1, hidden = 0, "shadowHidden" = 0 WHERE "UUID" = ?', [UUID]);

                // Reset video duration in case that caused it to be hidden
                if (videoInfo.hidden) await db.prepare("run", 'UPDATE "sponsorTimes" SET "videoDuration" = 0 WHERE "UUID" = ?', [UUID]);
            } else if (isVIP && incrementAmount <= 0 && voteTypeEnum === voteTypes.normal) {
                // Unlock if a VIP downvotes it
                await db.prepare("run", 'UPDATE "sponsorTimes" SET locked = 0 WHERE "UUID" = ?', [UUID]);
            }

            QueryCacher.clearVideoCache(videoInfo);
        }
        if (incrementAmount - oldIncrementAmount !== 0) {
            sendWebhooks({
                UUID,
                nonAnonUserID,
                voteTypeEnum,
                isVIP,
                isOwnSubmission,
                row: videoInfo,
                category,
                incrementAmount,
                oldIncrementAmount,
                finalResponse
            });
        }
        return res.status(finalResponse.finalStatus).send(finalResponse.finalMessage ?? undefined);
    } catch (err) {
        Logger.error(err as string);
        return res.status(500).json({error: "Internal error creating segment vote"});
    }
}