import {config} from "../config";
import {Logger} from "../utils/logger";
import {db, privateDB} from "../databases/databases";
import {getMaxResThumbnail, YouTubeAPI} from "../utils/youtubeApi";
import {getSubmissionUUID} from "../utils/getSubmissionUUID";
import fetch from "node-fetch";
import {getHash} from "../utils/getHash";
import {getIP} from "../utils/getIP";
import {getFormattedTime} from "../utils/getFormattedTime";
import {isUserTrustworthy} from "../utils/isUserTrustworthy";
import {dispatchEvent} from "../utils/webhookUtils";
import {Request, Response} from "express";
import { ActionType, Category, CategoryActionType, IncomingSegment, SegmentUUID, Service, VideoDuration, VideoID } from "../types/segments.model";
import { deleteLockCategories } from "./deleteLockCategories";
import { getCategoryActionType } from "../utils/categoryInfo";
import { QueryCacher } from "../utils/queryCacher";
import { getReputation } from "../utils/reputation";
import { APIVideoData, APIVideoInfo } from "../types/youtubeApi.model";
import { UserID } from "../types/user.model";

async function sendWebhookNotification(userID: string, videoID: string, UUID: string, submissionCount: number, youtubeData: APIVideoData, {submissionStart, submissionEnd}: { submissionStart: number; submissionEnd: number; }, segmentInfo: any) {
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

        const {data, err} = apiVideoInfo;
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

        fetch(config.discordFirstTimeSubmissionsWebhookURL, {
            method: "POST",
            body: JSON.stringify({
                "embeds": [{
                    "title": data?.title,
                    "url": `https://www.youtube.com/watch?v=${videoID}&t=${(parseInt(startTime.toFixed(0)) - 2)}`,
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
            }),
            headers: {
                "Content-Type": "application/json"
            }
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

    fetch(config.discordNeuralBlockRejectWebhookURL, {
        method: "POST",
        body: JSON.stringify({
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
            }],
        }),
        headers: {
            "Content-Type": "application/json"
        }
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
    submission: { videoID: VideoID; userID: UserID; segments: IncomingSegment[] }) {
    if (apiVideoInfo) {
        const {err, data} = apiVideoInfo;
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
        const response = await fetch(`${neuralBlockURL}/api/checkSponsorSegments?vid=${submission.videoID}
            &segments=${nbString.substring(0, nbString.length - 1)}`);
        if (!response.ok) return false;

        const nbPredictions = await response.json();
        let nbDecision = false;
        let predictionIdx = 0; //Keep track because only sponsor categories were submitted
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].category === "sponsor") {
                if (nbPredictions.probabilities[predictionIdx] < 0.70) {
                    nbDecision = true; // At least one bad entry
                    const startTime = parseFloat(segments[i].segment[0]);
                    const endTime = parseFloat(segments[i].segment[1]);

                    const UUID = getSubmissionUUID(submission.videoID, segments[i].actionType, submission.userID, startTime, endTime);
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

async function getYouTubeVideoInfo(videoID: VideoID, ignoreCache = false): Promise<APIVideoInfo> {
    if (config.newLeafURLs !== null) {
        return YouTubeAPI.listVideos(videoID, ignoreCache);
    } else {
        return null;
    }
}

async function checkUserActiveWarning(userID: string): Promise<{ pass: boolean; errorMessage: string; }> {
    const MILLISECONDS_IN_HOUR = 3600000;
    const now = Date.now();
    const warnings = await db.prepare("all",
        `SELECT "reason" 
        FROM warnings 
        WHERE "userID" = ? AND "issueTime" > ? AND enabled = 1
        ORDER BY "issueTime" DESC 
        LIMIT ?`,
        [
            userID,
            Math.floor(now - (config.hoursAfterWarningExpires * MILLISECONDS_IN_HOUR)),
            config.maxNumberOfActiveWarnings
        ],
    ) as {reason: string}[];

    if (warnings?.length >= config.maxNumberOfActiveWarnings) {
        const defaultMessage = "Submission rejected due to a warning from a moderator. This means that we noticed you were making some common mistakes that are not malicious, and we just want to clarify the rules. Could you please send a message in Discord or Matrix so we can further help you?";

        return {
            pass: false,
            errorMessage: warnings[0]?.reason?.length > 0 ? warnings[0].reason : defaultMessage
        };
    }

    return {pass: true, errorMessage: ""};
}

function proxySubmission(req: Request) {
    fetch(`${config.proxySubmission}/api/skipSegments?userID=${req.query.userID}&videoID=${req.query.videoID}`, {
        method: "POST",
        body: req.body,
    })
        .then(async res => {
            Logger.debug(`Proxy Submission: ${res.status} (${(await res.text())})`);
        })
        .catch(() => {
            Logger.error("Proxy Submission: Failed to make call");
        });
}

export async function postSkipSegments(req: Request, res: Response): Promise<Response> {
    if (config.proxySubmission) {
        proxySubmission(req);
    }

    const videoID = req.query.videoID || req.body.videoID;
    let userID = req.query.userID || req.body.userID;
    let service: Service = req.query.service ?? req.body.service ?? Service.YouTube;
    if (!Object.values(Service).some((val) => val === service)) {
        service = Service.YouTube;
    }
    const videoDurationParam: VideoDuration = (parseFloat(req.query.videoDuration || req.body.videoDuration) || 0) as VideoDuration;
    let videoDuration = videoDurationParam;

    let segments = req.body.segments as IncomingSegment[];
    if (segments === undefined) {
        // Use query instead
        segments = [{
            segment: [req.query.startTime as string, req.query.endTime as string],
            category: req.query.category as Category,
            actionType: (req.query.actionType as ActionType) ?? ActionType.Skip
        }];
    }
    // Add default action type
    segments.forEach((segment) => {
        if (!Object.values(ActionType).some((val) => val === segment.actionType)){
            segment.actionType = ActionType.Skip;
        }
    });

    const invalidFields = [];
    const errors = [];
    if (typeof videoID !== "string") {
        invalidFields.push("videoID");
    }
    if (typeof userID !== "string" || userID?.length < 30) {
        invalidFields.push("userID");
        if (userID?.length < 30) errors.push(`userID must be at least 30 characters long`);
    }
    if (!Array.isArray(segments) || segments.length < 1) {
        invalidFields.push("segments");
    }

    if (invalidFields.length !== 0) {
        // invalid request
        const formattedFields = invalidFields.reduce((p, c, i) => p + (i !== 0 ? ", " : "") + c, "");
        const formattedErrors = errors.reduce((p, c, i) => p + (i !== 0 ? ". " : " ") + c, "");
        return res.status(400).send(`No valid ${formattedFields} field(s) provided.${formattedErrors}`);
    }

    //hash the userID
    userID = getHash(userID);

    const warningResult: {pass: boolean, errorMessage: string} = await checkUserActiveWarning(userID);
    if (!warningResult.pass) {
        return res.status(403).send(warningResult.errorMessage);
    }

    let lockedCategoryList = (await db.prepare("all", 'SELECT category from "lockCategories" where "videoID" = ?', [videoID])).map((list: any) => list.category );

    //check if this user is on the vip list
    const isVIP = (await db.prepare("get", `SELECT count(*) as "userCount" FROM "vipUsers" WHERE "userID" = ?`, [userID])).userCount > 0;

    const decreaseVotes = 0;

    const previousSubmissions = await db.prepare("all",
        `SELECT "videoDuration", "UUID" 
        FROM "sponsorTimes" 
        WHERE "videoID" = ? AND "service" = ? AND 
            "hidden" = 0 AND "shadowHidden" = 0 AND 
            "votes" >= 0 AND "videoDuration" != 0`,
        [videoID, service]
    ) as {videoDuration: VideoDuration, UUID: SegmentUUID}[];

    // If the video's duration is changed, then the video should be unlocked and old submissions should be hidden
    const videoDurationChanged = (videoDuration: number) => videoDuration != 0
            && previousSubmissions.length > 0 && !previousSubmissions.some((e) => Math.abs(videoDuration - e.videoDuration) < 2);

    let apiVideoInfo: APIVideoInfo = null;
    if (service == Service.YouTube) {
        // Don't use cache if we don't know the video duraton, or the client claims that it has changed
        apiVideoInfo = await getYouTubeVideoInfo(videoID, !videoDurationParam || videoDurationChanged(videoDurationParam));
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

        // Reset lock categories
        lockedCategoryList = [];
        deleteLockCategories(videoID, null);
    }

    // Check if all submissions are correct
    for (let i = 0; i < segments.length; i++) {
        if (segments[i] === undefined || segments[i].segment === undefined || segments[i].category === undefined) {
            //invalid request
            return res.status(400).send("One of your segments are invalid");
        }

        if (!config.categoryList.includes(segments[i].category)) {
            return res.status(400).send("Category doesn't exist.");
        }

        // Reject segment if it's in the locked categories list
        if (!isVIP && lockedCategoryList.indexOf(segments[i].category) !== -1) {
            // TODO: Do something about the fradulent submission
            Logger.warn(`Caught a submission for a locked category. userID: '${userID}', videoID: '${videoID}', category: '${segments[i].category}', times: ${segments[i].segment}`);
            return res.status(403).send(
                `New submissions are not allowed for the following category: \
                '${segments[i].category}'. A moderator has decided that no new segments are needed and that all current segments of this category are timed perfectly.\n\n\
                ${(segments[i].category === "sponsor" ? "Maybe the segment you are submitting is a different category that you have not enabled and is not a sponsor. "+
                "Categories that aren't sponsor, such as self-promotion can be enabled in the options.\n\n" : "")}\
                If you believe this is incorrect, please contact someone on discord.gg/SponsorBlock or matrix.to/#/+sponsorblock:ajay.app`,
            );
        }


        const startTime = parseFloat(segments[i].segment[0]);
        const endTime = parseFloat(segments[i].segment[1]);

        if (isNaN(startTime) || isNaN(endTime)
                || startTime === Infinity || endTime === Infinity || startTime < 0 || startTime > endTime
                || (getCategoryActionType(segments[i].category) === CategoryActionType.Skippable && startTime === endTime)
                || (getCategoryActionType(segments[i].category) === CategoryActionType.POI && startTime !== endTime)) {
            //invalid request
            return res.status(400).send("One of your segments times are invalid (too short, startTime before endTime, etc.)");
        }

        if (!isVIP && segments[i].category === "sponsor" && Math.abs(startTime - endTime) < 1) {
            // Too short
            return res.status(400).send("Sponsors must be longer than 1 second long");
        }

        //check if this info has already been submitted before
        const duplicateCheck2Row = await db.prepare("get", `SELECT COUNT(*) as count FROM "sponsorTimes" WHERE "startTime" = ?
            and "endTime" = ? and "category" = ? and "videoID" = ? and "service" = ?`, [startTime, endTime, segments[i].category, videoID, service]);
        if (duplicateCheck2Row.count > 0) {
            return res.sendStatus(409);
        }
    }

    // Auto moderator check
    if (!isVIP && service == Service.YouTube) {
        const autoModerateResult = await autoModerateSubmission(apiVideoInfo, {userID, videoID, segments});//startTime, endTime, category: segments[i].category});
        if (autoModerateResult == "Rejected based on NeuralBlock predictions.") {
            // If NB automod rejects, the submission will start with -2 votes.
            // Note, if one submission is bad all submissions will be affected.
            // However, this behavior is consistent with other automod functions
            // already in place.
            //decreaseVotes = -2; //Disable for now
        } else if (autoModerateResult) {
            //Normal automod behavior
            return res.status(403).send(`Request rejected by auto moderator: ${autoModerateResult} If this is an issue, send a message on Discord.`);
        }
    }
    // Will be filled when submitting
    const UUIDs = [];
    const newSegments = [];

    //hash the ip 5000 times so no one can get it from the database
    const hashedIP = getHash(getIP(req) + config.globalSalt);

    try {
        //get current time
        const timeSubmitted = Date.now();

        const yesterday = timeSubmitted - 86400000;

        // Disable IP ratelimiting for now
        // eslint-disable-next-line no-constant-condition
        if (false) {
            //check to see if this ip has submitted too many sponsors today
            const rateLimitCheckRow = await privateDB.prepare("get", `SELECT COUNT(*) as count FROM "sponsorTimes" WHERE "hashedIP" = ? AND "videoID" = ? AND "timeSubmitted" > ?`, [hashedIP, videoID, yesterday]);

            if (rateLimitCheckRow.count >= 10) {
                //too many sponsors for the same video from the same ip address
                return res.sendStatus(429);
            }
        }

        // Disable max submissions for now
        // eslint-disable-next-line no-constant-condition
        if (false) {
            //check to see if the user has already submitted sponsors for this video
            const duplicateCheckRow = await db.prepare("get", `SELECT COUNT(*) as count FROM "sponsorTimes" WHERE "userID" = ? and "videoID" = ?`, [userID, videoID]);

            if (duplicateCheckRow.count >= 16) {
                //too many sponsors for the same video from the same user
                return res.sendStatus(429);
            }
        }

        //check to see if this user is shadowbanned
        const shadowBanRow = await db.prepare("get", `SELECT count(*) as "userCount" FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);

        let shadowBanned = shadowBanRow.userCount;

        if (!(await isUserTrustworthy(userID))) {
            //hide this submission as this user is untrustworthy
            shadowBanned = 1;
        }

        const startingVotes = 0 + decreaseVotes;
        const reputation = await getReputation(userID);

        for (const segmentInfo of segments) {
            //this can just be a hash of the data
            //it's better than generating an actual UUID like what was used before
            //also better for duplication checking
            const UUID = getSubmissionUUID(videoID, segmentInfo.actionType, userID, parseFloat(segmentInfo.segment[0]), parseFloat(segmentInfo.segment[1]));
            const hashedVideoID = getHash(videoID, 1);

            const startingLocked = isVIP ? 1 : 0;
            try {
                await db.prepare("run", `INSERT INTO "sponsorTimes" 
                    ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "actionType", "service", "videoDuration", "reputation", "shadowHidden", "hashedVideoID")
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    videoID, segmentInfo.segment[0], segmentInfo.segment[1], startingVotes, startingLocked, UUID, userID, timeSubmitted, 0, segmentInfo.category, segmentInfo.actionType, service, videoDuration, reputation, shadowBanned, hashedVideoID,
                ],
                );

                //add to private db as well
                await privateDB.prepare("run", `INSERT INTO "sponsorTimes" VALUES(?, ?, ?)`, [videoID, hashedIP, timeSubmitted]);

                // Clear redis cache for this video
                QueryCacher.clearVideoCache({
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
        Logger.error(err);
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
