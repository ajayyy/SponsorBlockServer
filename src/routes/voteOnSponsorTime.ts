import {Request, Response} from 'express';
import {Logger} from '../utils/logger';
import {isUserVIP} from '../utils/isUserVIP';
import fetch from 'node-fetch';
import {YouTubeAPI} from '../utils/youtubeApi';
import {db, privateDB} from '../databases/databases';
import {dispatchEvent, getVoteAuthor, getVoteAuthorRaw} from '../utils/webhookUtils';
import {isUserTrustworthy} from '../utils/isUserTrustworthy';
import {getFormattedTime} from '../utils/getFormattedTime';
import {getIP} from '../utils/getIP';
import {getHash} from '../utils/getHash';
import {config} from '../config';
import { UserID } from '../types/user.model';

const voteTypes = {
    normal: 0,
    incorrect: 1,
};

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
}

function sendWebhooks(voteData: VoteData) {
    const submissionInfoRow = db.prepare('get', "SELECT s.videoID, s.userID, s.startTime, s.endTime, s.category, u.userName, " +
        "(select count(1) from sponsorTimes where userID = s.userID) count, " +
        "(select count(1) from sponsorTimes where userID = s.userID and votes <= -2) disregarded " +
        "FROM sponsorTimes s left join userNames u on s.userID = u.userID where s.UUID=?",
        [voteData.UUID]);

    const userSubmissionCountRow = db.prepare('get', "SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?", [voteData.nonAnonUserID]);

    if (submissionInfoRow !== undefined && userSubmissionCountRow != undefined) {
        let webhookURL: string = null;
        if (voteData.voteTypeEnum === voteTypes.normal) {
            webhookURL = config.discordReportChannelWebhookURL;
        } else if (voteData.voteTypeEnum === voteTypes.incorrect) {
            webhookURL = config.discordCompletelyIncorrectReportWebhookURL;
        }

        if (config.youtubeAPIKey !== null) {
            YouTubeAPI.listVideos(submissionInfoRow.videoID, (err, data) => {
                if (err || data.items.length === 0) {
                    err && Logger.error(err.toString());
                    return;
                }
                const isUpvote = voteData.incrementAmount > 0;
                // Send custom webhooks
                dispatchEvent(isUpvote ? "vote.up" : "vote.down", {
                    "user": {
                        "status": getVoteAuthorRaw(userSubmissionCountRow.submissionCount, voteData.isVIP, voteData.isOwnSubmission),
                    },
                    "video": {
                        "id": submissionInfoRow.videoID,
                        "title": data.items[0].snippet.title,
                        "url": "https://www.youtube.com/watch?v=" + submissionInfoRow.videoID,
                        "thumbnail": data.items[0].snippet.thumbnails.maxres ? data.items[0].snippet.thumbnails.maxres.url : "",
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
                    fetch(webhookURL, {
                        method: 'POST',
                        body: JSON.stringify({
                            "embeds": [{
                                "title": data.items[0].snippet.title,
                                "url": "https://www.youtube.com/watch?v=" + submissionInfoRow.videoID
                                    + "&t=" + (submissionInfoRow.startTime.toFixed(0) - 2),
                                "description": "**" + voteData.row.votes + " Votes Prior | " +
                                    (voteData.row.votes + voteData.incrementAmount - voteData.oldIncrementAmount) + " Votes Now | " + voteData.row.views
                                    + " Views**\n\n**Submission ID:** " + voteData.UUID
                                    + "\n**Category:** " + submissionInfoRow.category
                                    + "\n\n**Submitted by:** " + submissionInfoRow.userName + "\n " + submissionInfoRow.userID
                                    + "\n\n**Total User Submissions:** " + submissionInfoRow.count
                                    + "\n**Ignored User Submissions:** " + submissionInfoRow.disregarded
                                    + "\n\n**Timestamp:** " +
                                    getFormattedTime(submissionInfoRow.startTime) + " to " + getFormattedTime(submissionInfoRow.endTime),
                                "color": 10813440,
                                "author": {
                                    "name": getVoteAuthor(userSubmissionCountRow.submissionCount, voteData.isVIP, voteData.isOwnSubmission),
                                },
                                "thumbnail": {
                                    "url": data.items[0].snippet.thumbnails.maxres ? data.items[0].snippet.thumbnails.maxres.url : "",
                                },
                            }],
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(async res => {
                        if (res.status >= 400) {
                            Logger.error("Error sending reported submission Discord hook");
                            Logger.error(JSON.stringify((await res.text())));
                            Logger.error("\n");
                        }
                    })
                    .catch(err => {
                        Logger.error("Failed to send reported submission Discord hook.");
                        Logger.error(JSON.stringify(err));
                        Logger.error("\n");
                    });
                }

            });
        }
    }
}

function categoryVote(UUID: string, userID: string, isVIP: boolean, isOwnSubmission: boolean, category: string, hashedIP: string, res: Response) {
    // Check if they've already made a vote
    const usersLastVoteInfo = privateDB.prepare('get', "select count(*) as votes, category from categoryVotes where UUID = ? and userID = ?", [UUID, userID]);

    if (usersLastVoteInfo?.category === category) {
        // Double vote, ignore
        res.sendStatus(200);
        return;
    }

    const currentCategory = db.prepare('get', "select category from sponsorTimes where UUID = ?", [UUID]);
    if (!currentCategory) {
        // Submission doesn't exist
        res.status(400).send("Submission doesn't exist.");
        return;
    }

    if (!config.categoryList.includes(category)) {
        res.status(400).send("Category doesn't exist.");
        return;
    }

    const nextCategoryInfo = db.prepare("get", "select votes from categoryVotes where UUID = ? and category = ?", [UUID, category]);

    const timeSubmitted = Date.now();

    const voteAmount = isVIP ? 500 : 1;

    // Add the vote
    if (db.prepare('get', "select count(*) as count from categoryVotes where UUID = ? and category = ?", [UUID, category]).count > 0) {
        // Update the already existing db entry
        db.prepare('run', "update categoryVotes set votes = votes + ? where UUID = ? and category = ?", [voteAmount, UUID, category]);
    } else {
        // Add a db entry
        db.prepare('run', "insert into categoryVotes (UUID, category, votes) values (?, ?, ?)", [UUID, category, voteAmount]);
    }

    // Add the info into the private db
    if (usersLastVoteInfo?.votes > 0) {
        // Reverse the previous vote
        db.prepare('run', "update categoryVotes set votes = votes - ? where UUID = ? and category = ?", [voteAmount, UUID, usersLastVoteInfo.category]);

        privateDB.prepare('run', "update categoryVotes set category = ?, timeSubmitted = ?, hashedIP = ? where userID = ? and UUID = ?", [category, timeSubmitted, hashedIP, userID, UUID]);
    } else {
        privateDB.prepare('run', "insert into categoryVotes (UUID, userID, hashedIP, category, timeSubmitted) values (?, ?, ?, ?, ?)", [UUID, userID, hashedIP, category, timeSubmitted]);
    }

    // See if the submissions category is ready to change
    const currentCategoryInfo = db.prepare("get", "select votes from categoryVotes where UUID = ? and category = ?", [UUID, currentCategory.category]);

    const submissionInfo = db.prepare("get", "SELECT userID, timeSubmitted, votes FROM sponsorTimes WHERE UUID = ?", [UUID]);
    const isSubmissionVIP = submissionInfo && isUserVIP(submissionInfo.userID);
    const startingVotes = isSubmissionVIP ? 10000 : 1;

    // Change this value from 1 in the future to make it harder to change categories
    // Done this way without ORs incase the value is zero
    const currentCategoryCount = (currentCategoryInfo === undefined || currentCategoryInfo === null) ? startingVotes : currentCategoryInfo.votes;

    // Add submission as vote
    if (!currentCategoryInfo && submissionInfo) {
        db.prepare("run", "insert into categoryVotes (UUID, category, votes) values (?, ?, ?)", [UUID, currentCategory.category, currentCategoryCount]);

        privateDB.prepare("run", "insert into categoryVotes (UUID, userID, hashedIP, category, timeSubmitted) values (?, ?, ?, ?, ?)", [UUID, submissionInfo.userID, "unknown", currentCategory.category, submissionInfo.timeSubmitted]);
    }

    const nextCategoryCount = (nextCategoryInfo?.votes || 0) + voteAmount;

    //TODO: In the future, raise this number from zero to make it harder to change categories
    // VIPs change it every time
    if (nextCategoryCount - currentCategoryCount >= Math.max(Math.ceil(submissionInfo?.votes / 2), 2) || isVIP || isOwnSubmission) {
        // Replace the category
        db.prepare('run', "update sponsorTimes set category = ? where UUID = ?", [category, UUID]);
    }

    res.sendStatus(200);
}

export function getUserID(req: Request): UserID {
    return req.query.userID as UserID;
}

export async function voteOnSponsorTime(req: Request, res: Response) {
    const UUID = req.query.UUID as string;
    const paramUserID = getUserID(req);
    let type = req.query.type !== undefined ? parseInt(req.query.type as string) : undefined;
    const category = req.query.category as string;

    if (UUID === undefined || paramUserID === undefined || (type === undefined && category === undefined)) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    const nonAnonUserID = getHash(paramUserID);
    const userID = getHash(paramUserID + UUID);

    //x-forwarded-for if this server is behind a proxy
    const ip = getIP(req);

    //hash the ip 5000 times so no one can get it from the database
    const hashedIP = getHash(ip + config.globalSalt);

    //check if this user is on the vip list
    const isVIP = db.prepare('get', "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [nonAnonUserID]).userCount > 0;

    //check if user voting on own submission
    const isOwnSubmission = db.prepare("get", "SELECT UUID as submissionCount FROM sponsorTimes where userID = ? AND UUID = ?", [nonAnonUserID, UUID]) !== undefined;

    
    // If not upvote
    if (!isVIP && type !== 1) {
        const isSegmentLocked = () => !!db.prepare('get', "SELECT locked FROM sponsorTimes WHERE UUID = ?", [UUID])?.locked; 
        const isVideoLocked = () => !!db.prepare('get', 'SELECT noSegments.category from noSegments left join sponsorTimes' + 
                                ' on (noSegments.videoID = sponsorTimes.videoID and noSegments.category = sponsorTimes.category)' + 
                                    ' where UUID = ?', [UUID]);

        if (isSegmentLocked() || isVideoLocked()) {
            res.status(403).send("Vote rejected: A moderator has decided that this segment is correct");
            return;
        }
    }

    if (type === undefined && category !== undefined) {
        return categoryVote(UUID, nonAnonUserID, isVIP, isOwnSubmission, category, hashedIP, res);
    }

    if (type == 1 && !isVIP && !isOwnSubmission) {
        // Check if upvoting hidden segment
        const voteInfo = db.prepare('get', "SELECT votes FROM sponsorTimes WHERE UUID = ?", [UUID]);

        if (voteInfo && voteInfo.votes <= -2) {
            res.status(403).send("Not allowed to upvote segment with too many downvotes unless you are VIP.");
            return;
        }
    }

    const MILLISECONDS_IN_HOUR = 3600000;
    const now = Date.now();
    const warningsCount = db.prepare('get', "SELECT count(1) as count FROM warnings WHERE userID = ? AND issueTime > ? AND enabled = 1",
        [nonAnonUserID, Math.floor(now - (config.hoursAfterWarningExpires * MILLISECONDS_IN_HOUR))],
    ).count;

    if (warningsCount >= config.maxNumberOfActiveWarnings) {
        return res.status(403).send('Vote rejected due to a warning from a moderator. This means that we noticed you were making some common mistakes that are not malicious, and we just want to clarify the rules. Could you please send a message in Discord or Matrix so we can further help you?');
    }

    const voteTypeEnum = (type == 0 || type == 1) ? voteTypes.normal : voteTypes.incorrect;

    try {
        //check if vote has already happened
        const votesRow = privateDB.prepare('get', "SELECT type FROM votes WHERE userID = ? AND UUID = ?", [userID, UUID]);

        //-1 for downvote, 1 for upvote. Maybe more depending on reputation in the future
        let incrementAmount = 0;
        let oldIncrementAmount = 0;

        if (type == 1 || type == 11) {
            //upvote
            incrementAmount = 1;
        } else if (type == 0 || type == 10) {
            //downvote
            incrementAmount = -1;
        } else if (type == 20) {
            //undo/cancel vote
            incrementAmount = 0;
        } else {
            //unrecongnised type of vote
            res.sendStatus(400);
            return;
        }
        if (votesRow != undefined) {
            if (votesRow.type === 1 || type === 11) {
                //upvote
                oldIncrementAmount = 1;
            } else if (votesRow.type === 0 || type === 10) {
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
        const row = db.prepare('get', "SELECT votes, views FROM sponsorTimes WHERE UUID = ?", [UUID]);

        if (voteTypeEnum === voteTypes.normal) {
            if ((isVIP || isOwnSubmission) && incrementAmount < 0) {
                //this user is a vip and a downvote
                incrementAmount = -(row.votes + 2 - oldIncrementAmount);
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
            || (db.prepare("get", "SELECT userID FROM sponsorTimes WHERE userID = ?", [nonAnonUserID]) !== undefined
                && privateDB.prepare("get", "SELECT userID FROM shadowBannedUsers WHERE userID = ?", [nonAnonUserID]) === undefined
                && privateDB.prepare("get", "SELECT UUID FROM votes WHERE UUID = ? AND hashedIP = ? AND userID != ?", [UUID, hashedIP, userID]) === undefined);

        if (ableToVote) {
            //update the votes table
            if (votesRow != undefined) {
                privateDB.prepare('run', "UPDATE votes SET type = ? WHERE userID = ? AND UUID = ?", [type, userID, UUID]);
            } else {
                privateDB.prepare('run', "INSERT INTO votes VALUES(?, ?, ?, ?)", [UUID, userID, hashedIP, type]);
            }

            let columnName = "";
            if (voteTypeEnum === voteTypes.normal) {
                columnName = "votes";
            } else if (voteTypeEnum === voteTypes.incorrect) {
                columnName = "incorrectVotes";
            }

            //update the vote count on this sponsorTime
            //oldIncrementAmount will be zero is row is null
            db.prepare('run', "UPDATE sponsorTimes SET " + columnName + " = " + columnName + " + ? WHERE UUID = ?", [incrementAmount - oldIncrementAmount, UUID]);
            if (isVIP && incrementAmount > 0 && voteTypeEnum === voteTypes.normal) {
                // Lock this submission
                db.prepare('run', "UPDATE sponsorTimes SET locked = 1 WHERE UUID = ?", [UUID]);
            }

            //for each positive vote, see if a hidden submission can be shown again
            if (incrementAmount > 0 && voteTypeEnum === voteTypes.normal) {
                //find the UUID that submitted the submission that was voted on
                const submissionUserIDInfo = db.prepare('get', "SELECT userID FROM sponsorTimes WHERE UUID = ?", [UUID]);
                if (!submissionUserIDInfo) {
                    // They are voting on a non-existent submission
                    res.status(400).send("Voting on a non-existent submission");
                    return;
                }

                const submissionUserID = submissionUserIDInfo.userID;

                //check if any submissions are hidden
                const hiddenSubmissionsRow = db.prepare('get', "SELECT count(*) as hiddenSubmissions FROM sponsorTimes WHERE userID = ? AND shadowHidden > 0", [submissionUserID]);

                if (hiddenSubmissionsRow.hiddenSubmissions > 0) {
                    //see if some of this users submissions should be visible again

                    if (await isUserTrustworthy(submissionUserID)) {
                        //they are trustworthy again, show 2 of their submissions again, if there are two to show
                        db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 0 WHERE ROWID IN (SELECT ROWID FROM sponsorTimes WHERE userID = ? AND shadowHidden = 1 LIMIT 2)", [submissionUserID]);
                    }
                }
            }
        }

        res.sendStatus(200);

        if (incrementAmount - oldIncrementAmount !== 0) {
            sendWebhooks({
                UUID,
                nonAnonUserID,
                voteTypeEnum,
                isVIP,
                isOwnSubmission,
                row,
                category,
                incrementAmount,
                oldIncrementAmount,
            });
        }
    } catch (err) {
        Logger.error(err);

        res.status(500).json({error: 'Internal error creating segment vote'});
    }
}