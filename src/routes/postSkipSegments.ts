import { config } from "../config";
import { Logger } from "../utils/logger";
import { db, privateDB } from "../databases/databases";
import { getMaxResThumbnail, YouTubeAPI } from "../utils/youtubeApi";
import { getSubmissionUUID } from "../utils/getSubmissionUUID";
import { getHash } from "../utils/getHash";
import { getHashCache } from "../utils/getHashCache";
import { getIP } from "../utils/getIP";
import { getFormattedTime } from "../utils/getFormattedTime";
import { dispatchEvent } from "../utils/webhookUtils";
import { Request, Response } from "express";
import { ActionType, Category, CategoryActionType, IncomingSegment, IPAddress, SegmentUUID, Service, VideoDuration, VideoID } from "../types/segments.model";
import { deleteLockCategories } from "./deleteLockCategories";
import { getCategoryActionType } from "../utils/categoryInfo";
import { QueryCacher } from "../utils/queryCacher";
import { getReputation } from "../utils/reputation";
import { APIVideoData, APIVideoInfo } from "../types/youtubeApi.model";
import { HashedUserID, UserID } from "../types/user.model";
import { isUserVIP } from "../utils/isUserVIP";
import { parseUserAgent } from "../utils/userAgent";
import { getService } from "../utils/getService";
import axios from "axios";
import { vote } from "./voteOnSponsorTime";

type CheckResult = {
    pass: boolean,
    errorMessage: string,
    errorCode: number
};

const CHECK_PASS: CheckResult = {
    pass: true,
    errorMessage: "",
    errorCode: 0
};

async function sendWebhookNotification(userID: string, videoID: string, UUID: string, submissionCount: number, youtubeData: APIVideoData, { submissionStart, submissionEnd }: { submissionStart: number; submissionEnd: number; }, segmentInfo: any) {
    const row = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID]);
    const userName = row !== undefined ? row.userName : null;

    let scopeName = "submissions.other";
    if (submissionCount <= 1) {
        scopeName = "submissions.new";
    }

    dispatchEvent(scopeName, {
        "video": {
            "id": videoID,
            "title": youtubeData?.title,
            "thumbnail": getMaxResThumbnail(youtubeData) || null,
            "url": `https://www.youtube.com/watch?v=${videoID}`,
        },
        "submission": {
            "UUID": UUID,
            "category": segmentInfo.category,
            "startTime": submissionStart,
            "endTime": submissionEnd,
            "user": {
                "UUID": userID,
                "username": userName,
            },
        },
    });
}

async function sendWebhooks(apiVideoInfo: APIVideoInfo, userID: string, videoID: string, UUID: string, segmentInfo: any, service: Service) {
    if (apiVideoInfo && service == Service.YouTube) {
        const userSubmissionCountRow = await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "sponsorTimes" WHERE "userID" = ?`, [userID]);

        const { data, err } = apiVideoInfo;
        if (err) return;

        const startTime = parseFloat(segmentInfo.segment[0]);
        const endTime = parseFloat(segmentInfo.segment[1]);
        sendWebhookNotification(userID, videoID, UUID, userSubmissionCountRow.submissionCount, data, {
            submissionStart: startTime,
            submissionEnd: endTime,
        }, segmentInfo);

        // If it is a first time submission
        // Then send a notification to discord
        if (config.discordFirstTimeSubmissionsWebhookURL === null || userSubmissionCountRow.submissionCount > 1) return;

        axios.post(config.discordFirstTimeSubmissionsWebhookURL, {
            "embeds": [{
                "title": data?.title,
                "url": `https://www.youtube.com/watch?v=${videoID}&t=${(parseInt(startTime.toFixed(0)) - 2)}s#requiredSegment=${UUID}`,
                "description": `Submission ID: ${UUID}\
                    \n\nTimestamp: \
                    ${getFormattedTime(startTime)} to ${getFormattedTime(endTime)}\
                    \n\nCategory: ${segmentInfo.category}`,
                "color": 10813440,
                "author": {
                    "name": userID,
                },
                "thumbnail": {
                    "url": getMaxResThumbnail(data) || "",
                },
            }],
        })
            .then(res => {
                if (res.status >= 400) {
                    Logger.error("Error sending first time submission Discord hook");
                    Logger.error(JSON.stringify(res));
                    Logger.error("\n");
                }
            })
            .catch(err => {
                Logger.error("Failed to send first time submission Discord hook.");
                Logger.error(JSON.stringify(err));
                Logger.error("\n");
            });
    }
}

async function sendWebhooksNB(userID: string, videoID: string, UUID: string, startTime: number, endTime: number, category: string, probability: number, ytData: any) {
    const submissionInfoRow = await db.prepare("get", `SELECT
        (select count(1) from "sponsorTimes" where "userID" = ?) count,
        (select count(1) from "sponsorTimes" where "userID" = ? and "votes" <= -2) disregarded,
        coalesce((select "userName" FROM "userNames" WHERE "userID" = ?), ?) "userName"`,
    [userID, userID, userID, userID]);

    let submittedBy: string;
    // If a userName was created then show both
    if (submissionInfoRow.userName !== userID) {
        submittedBy = `${submissionInfoRow.userName}\n${userID}`;
    } else {
        submittedBy = userID;
    }

    // Send discord message
    if (config.discordNeuralBlockRejectWebhookURL === null) return;

    axios.post(config.discordNeuralBlockRejectWebhookURL, {
        "embeds": [{
            "title": ytData.items[0].snippet.title,
            "url": `https://www.youtube.com/watch?v=${videoID}&t=${(parseFloat(startTime.toFixed(0)) - 2)}`,
            "description": `**Submission ID:** ${UUID}\
                \n**Timestamp:** ${getFormattedTime(startTime)} to ${getFormattedTime(endTime)}\
                \n**Predicted Probability:** ${probability}\
                \n**Category:** ${category}\
                \n**Submitted by:** ${submittedBy}\
                \n**Total User Submissions:** ${submissionInfoRow.count}\
                \n**Ignored User Submissions:** ${submissionInfoRow.disregarded}`,
            "color": 10813440,
            "thumbnail": {
                "url": ytData.items[0].snippet.thumbnails.maxres ? ytData.items[0].snippet.thumbnails.maxres.url : "",
            },
        }]
    })
        .then(res => {
            if (res.status >= 400) {
                Logger.error("Error sending NeuralBlock Discord hook");
                Logger.error(JSON.stringify(res));
                Logger.error("\n");
            }
        })
        .catch(err => {
            Logger.error("Failed to send NeuralBlock Discord hook.");
            Logger.error(JSON.stringify(err));
            Logger.error("\n");
        });
}

// callback:  function(reject: "String containing reason the submission was rejected")
// returns: string when an error, false otherwise

// Looks like this was broken for no defined youtube key - fixed but IMO we shouldn't return
//   false for a pass - it was confusing and lead to this bug - any use of this function in
//   the future could have the same problem.
async function autoModerateSubmission(apiVideoInfo: APIVideoInfo,
    submission: { videoID: VideoID; userID: UserID; segments: IncomingSegment[], service: Service }) {
    if (apiVideoInfo) {
        const { err, data } = apiVideoInfo;
        if (err) return false;

        const duration = apiVideoInfo?.data?.lengthSeconds;
        const segments = submission.segments;
        let nbString = "";
        for (let i = 0; i < segments.length; i++) {
            if (duration == 0) {
                // Allow submission if the duration is 0 (bug in youtube api)
                return false;
            } else {
                if (segments[i].category === "sponsor") {
                    //Prepare timestamps to send to NB all at once
                    nbString = `${nbString}${segments[i].segment[0]},${segments[i].segment[1]};`;
                }
            }
        }

        // Get all submissions for this user
        const allSubmittedByUser = await db.prepare("all", `SELECT "startTime", "endTime" FROM "sponsorTimes" WHERE "userID" = ? and "videoID" = ? and "votes" > -1`, [submission.userID, submission.videoID]);
        const allSegmentTimes = [];
        if (allSubmittedByUser !== undefined) {
            //add segments the user has previously submitted
            for (const segmentInfo of allSubmittedByUser) {
                allSegmentTimes.push([parseFloat(segmentInfo.startTime), parseFloat(segmentInfo.endTime)]);
            }
        }

        //add segments they are trying to add in this submission
        for (let i = 0; i < segments.length; i++) {
            const startTime = parseFloat(segments[i].segment[0]);
            const endTime = parseFloat(segments[i].segment[1]);
            allSegmentTimes.push([startTime, endTime]);
        }

        //merge all the times into non-overlapping arrays
        const allSegmentsSorted = mergeTimeSegments(allSegmentTimes.sort(function (a, b) {
            return a[0] - b[0] || a[1] - b[1];
        }));

        const videoDuration = data?.lengthSeconds;
        if (videoDuration != 0) {
            let allSegmentDuration = 0;
            //sum all segment times together
            allSegmentsSorted.forEach(segmentInfo => allSegmentDuration += segmentInfo[1] - segmentInfo[0]);
            if (allSegmentDuration > (videoDuration / 100) * 80) {
                // Reject submission if all segments combine are over 80% of the video
                return "Total length of your submitted segments are over 80% of the video.";
            }
        }

        // Check NeuralBlock
        const neuralBlockURL = config.neuralBlockURL;
        if (!neuralBlockURL) return false;
        const response = await axios.get(`${neuralBlockURL}/api/checkSponsorSegments?vid=${submission.videoID}
            &segments=${nbString.substring(0, nbString.length - 1)}`, { validateStatus: () => true });
        if (response.status !== 200) return false;

        const nbPredictions = response.data;
        let nbDecision = false;
        let predictionIdx = 0; //Keep track because only sponsor categories were submitted
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].category === "sponsor") {
                if (nbPredictions.probabilities[predictionIdx] < 0.70) {
                    nbDecision = true; // At least one bad entry
                    const startTime = parseFloat(segments[i].segment[0]);
                    const endTime = parseFloat(segments[i].segment[1]);

                    const UUID = getSubmissionUUID(submission.videoID, segments[i].category, segments[i].actionType, submission.userID, startTime, endTime, submission.service);
                    // Send to Discord
                    // Note, if this is too spammy. Consider sending all the segments as one Webhook
                    sendWebhooksNB(submission.userID, submission.videoID, UUID, startTime, endTime, segments[i].category, nbPredictions.probabilities[predictionIdx], data);
                }
                predictionIdx++;
            }

        }

        if (nbDecision) {
            return "Rejected based on NeuralBlock predictions.";
        } else {
            return false;
        }
    } else {
        Logger.debug("Skipped YouTube API");

        // Can't moderate the submission without calling the youtube API
        // so allow by default.
        return false;
    }
}

function getYouTubeVideoInfo(videoID: VideoID, ignoreCache = false): Promise<APIVideoInfo> {
    if (config.newLeafURLs !== null) {
        return YouTubeAPI.listVideos(videoID, ignoreCache);
    } else {
        return null;
    }
}

async function checkUserActiveWarning(userID: string): Promise<CheckResult> {
    const MILLISECONDS_IN_HOUR = 3600000;
    const now = Date.now();
    const warnings = (await db.prepare("all",
        `SELECT "reason" 
        FROM warnings 
        WHERE "userID" = ? AND "issueTime" > ? AND enabled = 1
        ORDER BY "issueTime" DESC`,
        [
            userID,
            Math.floor(now - (config.hoursAfterWarningExpires * MILLISECONDS_IN_HOUR))
        ],
    ) as {reason: string}[]).sort((a, b) => (b?.reason?.length ?? 0) - (a?.reason?.length ?? 0));

    if (warnings?.length >= config.maxNumberOfActiveWarnings) {
        const defaultMessage = "Submission rejected due to a warning from a moderator. This means that we noticed you were making some common mistakes"
                                + " that are not malicious, and we just want to clarify the rules. "
                                + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
                                + `Your userID is ${userID}.`;

        return {
            pass: false,
            errorMessage: defaultMessage + (warnings[0]?.reason?.length > 0 ? `\n\nWarning reason: '${warnings[0].reason}'` : ""),
            errorCode: 403
        };
    }

    return CHECK_PASS;
}

function checkInvalidFields(videoID: VideoID, userID: UserID, segments: IncomingSegment[]): CheckResult {
    const invalidFields = [];
    const errors = [];
    if (typeof videoID !== "string" || videoID?.length == 0) {
        invalidFields.push("videoID");
    }
    if (typeof userID !== "string" || userID?.length < 30) {
        invalidFields.push("userID");
        if (userID?.length < 30) errors.push(`userID must be at least 30 characters long`);
    }
    if (!Array.isArray(segments) || segments.length < 1) {
        invalidFields.push("segments");
    }
    // validate start and end times (no : marks)
    for (const segmentPair of segments) {
        const startTime = segmentPair.segment[0];
        const endTime = segmentPair.segment[1];
        if ((typeof startTime === "string" && startTime.includes(":")) ||
            (typeof endTime === "string" && endTime.includes(":"))) {
            invalidFields.push("segment time");
        }

        if (typeof segmentPair.description !== "string"
                || (segmentPair.description.length > 60 && segmentPair.actionType === ActionType.Chapter)
                || (segmentPair.description.length !== 0 && segmentPair.actionType !== ActionType.Chapter)) {
            invalidFields.push("segment description");
        }
    }

    if (invalidFields.length !== 0) {
        // invalid request
        const formattedFields = invalidFields.reduce((p, c, i) => p + (i !== 0 ? ", " : "") + c, "");
        const formattedErrors = errors.reduce((p, c, i) => p + (i !== 0 ? ". " : " ") + c, "");
        return {
            pass: false,
            errorMessage: `No valid ${formattedFields} field(s) provided.${formattedErrors}`,
            errorCode: 400
        };
    }

    return CHECK_PASS;
}

async function checkEachSegmentValid(rawIP: IPAddress, paramUserID: UserID, userID: HashedUserID, videoID: VideoID,
    segments: IncomingSegment[], service: string, isVIP: boolean, lockedCategoryList: Array<any>): Promise<CheckResult> {

    for (let i = 0; i < segments.length; i++) {
        if (segments[i] === undefined || segments[i].segment === undefined || segments[i].category === undefined) {
            //invalid request
            return { pass: false, errorMessage: "One of your segments are invalid", errorCode: 400 };
        }

        if (!config.categoryList.includes(segments[i].category)) {
            return { pass: false, errorMessage: "Category doesn't exist.", errorCode: 400 };
        }

        // Reject segment if it's in the locked categories list
        const lockIndex = lockedCategoryList.findIndex(c => segments[i].category === c.category && segments[i].actionType === c.actionType);
        if (!isVIP && lockIndex !== -1) {
            // TODO: Do something about the fradulent submission
            Logger.warn(`Caught a submission for a locked category. userID: '${userID}', videoID: '${videoID}', category: '${segments[i].category}', times: ${segments[i].segment}`);
            return {
                pass: false,
                errorCode: 403,
                errorMessage:
                    `Users have voted that new segments aren't needed for the following category: ` +
                    `'${segments[i].category}'\n` +
                    `${lockedCategoryList[lockIndex].reason?.length !== 0 ? `\nReason: '${lockedCategoryList[lockIndex].reason}'` : ""}\n` +
                    `${(segments[i].category === "sponsor" ? "\nMaybe the segment you are submitting is a different category that you have not enabled and is not a sponsor. " +
                    "Categories that aren't sponsor, such as self-promotion can be enabled in the options.\n" : "")}` +
                    `\nIf you believe this is incorrect, please contact someone on chat.sponsor.ajay.app, discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app`
            };
        }

        if (!config.categorySupport[segments[i].category]?.includes(segments[i].actionType)) {
            return { pass: false, errorMessage: "ActionType is not supported with this category.", errorCode: 400 };
        }

        const startTime = parseFloat(segments[i].segment[0]);
        const endTime = parseFloat(segments[i].segment[1]);

        if (isNaN(startTime) || isNaN(endTime)
                || startTime === Infinity || endTime === Infinity || startTime < 0 || startTime > endTime
                || (getCategoryActionType(segments[i].category) === CategoryActionType.Skippable
                    && segments[i].actionType !== ActionType.Full && startTime === endTime)
                || (getCategoryActionType(segments[i].category) === CategoryActionType.POI && startTime !== endTime)
                || (segments[i].actionType === ActionType.Full && (startTime !== 0 || endTime !== 0))) {
            //invalid request
            return { pass: false, errorMessage: "One of your segments times are invalid (too short, endTime before startTime, etc.)", errorCode: 400 };
        }

        // Check for POI segments before some seconds
        if (!isVIP && getCategoryActionType(segments[i].category) === CategoryActionType.POI && startTime < config.poiMinimumStartTime) {
            return { pass: false, errorMessage: `POI cannot be that early`, errorCode: 400 };
        }

        if (!isVIP && segments[i].category === "sponsor"
                && segments[i].actionType !== ActionType.Full && Math.abs(startTime - endTime) < 1) {
            // Too short
            return { pass: false, errorMessage: "Segments must be longer than 1 second long", errorCode: 400 };
        }

        //check if this info has already been submitted before
        const duplicateCheck2Row = await db.prepare("get", `SELECT "UUID" FROM "sponsorTimes" WHERE "startTime" = ?
            and "endTime" = ? and "category" = ? and "actionType" = ? and "videoID" = ? and "service" = ?`, [startTime, endTime, segments[i].category, segments[i].actionType, videoID, service]);
        if (duplicateCheck2Row) {
            if (segments[i].actionType === ActionType.Full) {
                // Forward as vote
                await vote(rawIP, duplicateCheck2Row.UUID, paramUserID, 1);
                segments[i].ignoreSegment = true;
                continue;
            } else {
                return { pass: false, errorMessage: "Segment has already been submitted before.", errorCode: 409 };
            }
        }
    }

    return CHECK_PASS;
}

async function checkByAutoModerator(videoID: any, userID: any, segments: Array<any>, isVIP: boolean, service:string, apiVideoInfo: APIVideoInfo, decreaseVotes: number): Promise<CheckResult & { decreaseVotes: number; } > {
    // Auto moderator check
    if (!isVIP && service == Service.YouTube) {
        const autoModerateResult = await autoModerateSubmission(apiVideoInfo, { userID, videoID, segments, service });//startTime, endTime, category: segments[i].category});

        if (autoModerateResult == "Rejected based on NeuralBlock predictions.") {
            // If NB automod rejects, the submission will start with -2 votes.
            // Note, if one submission is bad all submissions will be affected.
            // However, this behavior is consistent with other automod functions
            // already in place.
            //decreaseVotes = -2; //Disable for now
        } else if (autoModerateResult) {
            //Normal automod behavior
            return {
                pass: false,
                errorCode: 403,
                errorMessage: `Request rejected by auto moderator: ${autoModerateResult} If this is an issue, send a message on Discord.`,
                decreaseVotes
            };
        }
    }

    return {
        ...CHECK_PASS,
        decreaseVotes
    };
}

async function updateDataIfVideoDurationChange(videoID: VideoID, service: Service, videoDuration: VideoDuration, videoDurationParam: VideoDuration) {
    let lockedCategoryList = await db.prepare("all", 'SELECT category, "actionType", reason from "lockCategories" where "videoID" = ? AND "service" = ?', [videoID, service]);

    const previousSubmissions = await db.prepare("all",
        `SELECT "videoDuration", "UUID" 
        FROM "sponsorTimes" 
        WHERE "videoID" = ? AND "service" = ? AND 
            "hidden" = 0 AND "shadowHidden" = 0 AND 
            "actionType" != 'full' AND
            "votes" > -2 AND "videoDuration" != 0`,
        [videoID, service]
    ) as {videoDuration: VideoDuration, UUID: SegmentUUID}[];

    // If the video's duration is changed, then the video should be unlocked and old submissions should be hidden
    const videoDurationChanged = (videoDuration: number) => videoDuration != 0
        && previousSubmissions.length > 0 && !previousSubmissions.some((e) => Math.abs(videoDuration - e.videoDuration) < 2);

    let apiVideoInfo: APIVideoInfo = null;
    if (service == Service.YouTube) {
        // Don't use cache if we don't know the video duration, or the client claims that it has changed
        apiVideoInfo = await getYouTubeVideoInfo(videoID, !videoDurationParam || previousSubmissions.length === 0 || videoDurationChanged(videoDurationParam));
    }
    const apiVideoDuration = apiVideoInfo?.data?.lengthSeconds as VideoDuration;
    if (!videoDurationParam || (apiVideoDuration && Math.abs(videoDurationParam - apiVideoDuration) > 2)) {
        // If api duration is far off, take that one instead (it is only precise to seconds, not millis)
        videoDuration = apiVideoDuration || 0 as VideoDuration;
    }

    // Only treat as difference if both the api duration and submitted duration have changed
    if (videoDurationChanged(videoDuration) && (!videoDurationParam || videoDurationChanged(videoDurationParam))) {
        // Hide all previous submissions
        for (const submission of previousSubmissions) {
            await db.prepare("run", `UPDATE "sponsorTimes" SET "hidden" = 1 WHERE "UUID" = ?`, [submission.UUID]);
        }
        lockedCategoryList = [];
        deleteLockCategories(videoID, null, service);
    }

    return {
        videoDuration,
        apiVideoInfo,
        lockedCategoryList
    };
}

// Disable max submissions for now
// Disable IP ratelimiting for now
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkRateLimit(userID:string, videoID: VideoID, service: Service, timeSubmitted: number, hashedIP: string, options: {
    enableCheckByIP: boolean;
    enableCheckByUserID: boolean;
} = {
    enableCheckByIP: false,
    enableCheckByUserID: false
}): Promise<CheckResult> {
    const yesterday = timeSubmitted - 86400000;

    if (options.enableCheckByIP) {
        //check to see if this ip has submitted too many sponsors today
        const rateLimitCheckRow = await privateDB.prepare("get", `SELECT COUNT(*) as count FROM "sponsorTimes" WHERE "hashedIP" = ? AND "videoID" = ? AND "timeSubmitted" > ? AND "service" = ?`, [hashedIP, videoID, yesterday, service]);

        if (rateLimitCheckRow.count >= 10) {
            //too many sponsors for the same video from the same ip address
            return {
                pass: false,
                errorCode: 429,
                errorMessage: "Have submited many sponsors for the same video."
            };
        }
    }

    if (options.enableCheckByUserID) {
        //check to see if the user has already submitted sponsors for this video
        const duplicateCheckRow = await db.prepare("get", `SELECT COUNT(*) as count FROM "sponsorTimes" WHERE "userID" = ? and "videoID" = ?`, [userID, videoID]);

        if (duplicateCheckRow.count >= 16) {
            //too many sponsors for the same video from the same user
            return {
                pass: false,
                errorCode: 429,
                errorMessage: "Have submited many sponsors for the same video."
            };
        }
    }

    return CHECK_PASS;
}

function proxySubmission(req: Request) {
    axios.post(`${config.proxySubmission}/api/skipSegments?userID=${req.query.userID}&videoID=${req.query.videoID}`, req.body)
        .then(res => {
            Logger.debug(`Proxy Submission: ${res.status} (${res.data})`);
        })
        .catch(() => {
            Logger.error("Proxy Submission: Failed to make call");
        });
}

function preprocessInput(req: Request) {
    const videoID = req.query.videoID || req.body.videoID;
    const userID = req.query.userID || req.body.userID;
    const service = getService(req.query.service, req.body.service);
    const videoDurationParam: VideoDuration = (parseFloat(req.query.videoDuration || req.body.videoDuration) || 0) as VideoDuration;
    const videoDuration = videoDurationParam;

    let segments = req.body.segments as IncomingSegment[];
    if (segments === undefined) {
        // Use query instead
        segments = [{
            segment: [req.query.startTime as string, req.query.endTime as string],
            category: req.query.category as Category,
            actionType: (req.query.actionType as ActionType) ?? ActionType.Skip,
            description: req.query.description as string || "",
        }];
    }
    // Add default action type
    segments.forEach((segment) => {
        if (!Object.values(ActionType).some((val) => val === segment.actionType)){
            segment.actionType = ActionType.Skip;
        }

        segment.description ??= "";
        segment.segment = segment.segment.map((time) => typeof segment.segment[0] === "string" ? time?.replace(",", ".") : time);
    });

    const userAgent = req.query.userAgent ?? req.body.userAgent ?? parseUserAgent(req.get("user-agent")) ?? "";

    return { videoID, userID, service, videoDuration, videoDurationParam, segments, userAgent };
}

export async function postSkipSegments(req: Request, res: Response): Promise<Response> {
    if (config.proxySubmission) {
        proxySubmission(req);
    }

    // eslint-disable-next-line prefer-const
    let { videoID, userID: paramUserID, service, videoDuration, videoDurationParam, segments, userAgent } = preprocessInput(req);

    const invalidCheckResult = checkInvalidFields(videoID, paramUserID, segments);
    if (!invalidCheckResult.pass) {
        return res.status(invalidCheckResult.errorCode).send(invalidCheckResult.errorMessage);
    }

    //hash the userID
    const userID = await getHashCache(paramUserID);

    const userWarningCheckResult = await checkUserActiveWarning(userID);
    if (!userWarningCheckResult.pass) {
        Logger.warn(`Caught a submission for for a warned user. userID: '${userID}', videoID: '${videoID}', category: '${segments.reduce<string>((prev, val) => `${prev} ${val.category}`, "")}', times: ${segments.reduce<string>((prev, val) => `${prev} ${val.segment}`, "")}`);
        return res.status(userWarningCheckResult.errorCode).send(userWarningCheckResult.errorMessage);
    }

    const isVIP = await isUserVIP(userID);
    const rawIP = getIP(req);

    const newData = await updateDataIfVideoDurationChange(videoID, service, videoDuration, videoDurationParam);
    videoDuration = newData.videoDuration;
    const { lockedCategoryList, apiVideoInfo } = newData;

    // Check if all submissions are correct
    const segmentCheckResult = await checkEachSegmentValid(rawIP, paramUserID, userID, videoID, segments, service, isVIP, lockedCategoryList);
    if (!segmentCheckResult.pass) {
        return res.status(segmentCheckResult.errorCode).send(segmentCheckResult.errorMessage);
    }

    let decreaseVotes = 0;
    // Auto check by NB
    const autoModerateCheckResult = await checkByAutoModerator(videoID, userID, segments, isVIP, service, apiVideoInfo, decreaseVotes);
    if (!autoModerateCheckResult.pass) {
        return res.status(autoModerateCheckResult.errorCode).send(autoModerateCheckResult.errorMessage);
    } else {
        decreaseVotes = autoModerateCheckResult.decreaseVotes;
    }

    // Will be filled when submitting
    const UUIDs = [];
    const newSegments = [];

    //hash the ip 5000 times so no one can get it from the database
    const hashedIP = await getHashCache(rawIP + config.globalSalt);

    try {
        //get current time
        const timeSubmitted = Date.now();

        // const rateLimitCheckResult = checkRateLimit(userID, videoID, service, timeSubmitted, hashedIP);
        // if (!rateLimitCheckResult.pass) {
        //     return res.status(rateLimitCheckResult.errorCode).send(rateLimitCheckResult.errorMessage);
        // }

        //check to see if this user is shadowbanned
        const shadowBanRow = await db.prepare("get", `SELECT count(*) as "userCount" FROM "shadowBannedUsers" WHERE "userID" = ? LIMIT 1`, [userID]);
        const startingVotes = 0 + decreaseVotes;
        const reputation = await getReputation(userID);

        for (const segmentInfo of segments) {
            // Full segments are always rejected since there can only be one, so shadow hide wouldn't work
            if (segmentInfo.ignoreSegment
                || (shadowBanRow.userCount && segmentInfo.actionType === ActionType.Full)) {
                continue;
            }

            //this can just be a hash of the data
            //it's better than generating an actual UUID like what was used before
            //also better for duplication checking
            const UUID = getSubmissionUUID(videoID, segmentInfo.category, segmentInfo.actionType, userID, parseFloat(segmentInfo.segment[0]), parseFloat(segmentInfo.segment[1]), service);
            const hashedVideoID = getHash(videoID, 1);

            const startingLocked = isVIP ? 1 : 0;
            try {
                await db.prepare("run", `INSERT INTO "sponsorTimes" 
                    ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "reputation", "shadowHidden", "hashedVideoID", "userAgent", "description")
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    videoID, segmentInfo.segment[0], segmentInfo.segment[1], startingVotes, startingLocked, UUID, userID, timeSubmitted, 0
                    , segmentInfo.category, segmentInfo.actionType, service, videoDuration, reputation, shadowBanRow.userCount, hashedVideoID, userAgent, segmentInfo.description
                ],
                );

                //add to private db as well
                await privateDB.prepare("run", `INSERT INTO "sponsorTimes" VALUES(?, ?, ?, ?)`, [videoID, hashedIP, timeSubmitted, service]);

                await db.prepare("run", `INSERT INTO "videoInfo" ("videoID", "channelID", "title", "published", "genreUrl") 
                    SELECT ?, ?, ?, ?, ?
                    WHERE NOT EXISTS (SELECT 1 FROM "videoInfo" WHERE "videoID" = ?)`, [
                    videoID, apiVideoInfo?.data?.authorId || "", apiVideoInfo?.data?.title || "", apiVideoInfo?.data?.published || 0, apiVideoInfo?.data?.genreUrl || "", videoID]);

                // Clear redis cache for this video
                QueryCacher.clearSegmentCache({
                    videoID,
                    hashedVideoID,
                    service,
                    userID
                });
            } catch (err) {
                //a DB change probably occurred
                Logger.error(`Error when putting sponsorTime in the DB: ${videoID}, ${segmentInfo.segment[0]}, ${segmentInfo.segment[1]}, ${userID}, ${segmentInfo.category}. ${err}`);
                return res.sendStatus(500);
            }

            UUIDs.push(UUID);
            newSegments.push({
                UUID: UUID,
                category: segmentInfo.category,
                segment: segmentInfo.segment,
            });
        }
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }

    for (let i = 0; i < segments.length; i++) {
        sendWebhooks(apiVideoInfo, userID, videoID, UUIDs[i], segments[i], service);
    }
    return res.json(newSegments);
}

// Takes an array of arrays:
// ex)
// [
//     [3, 40],
//     [50, 70],
//     [60, 80],
//     [100, 150]
// ]
// => transforms to combining overlapping segments
// [
//     [3, 40],
//     [50, 80],
//     [100, 150]
// ]
function mergeTimeSegments(ranges: number[][]) {
    const result: number[][] = [];
    let last: number[];

    ranges.forEach(function (r) {
        if (!last || r[0] > last[1])
            result.push(last = r);
        else if (r[1] > last[1])
            last[1] = r[1];
    });

    return result;
}
