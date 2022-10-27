import { config } from "../config";
import { Logger } from "../utils/logger";
import { authorType, WebhookData } from "../types/webhook.model";
import { getFormattedTime } from "../utils/getFormattedTime";
import axios from "axios";

function getVoteAuthorRaw(submissionCount: number, isTempVIP: boolean, isVIP: boolean, isOwnSubmission: boolean): authorType {
    if (isOwnSubmission) {
        return "self";
    } else if (isTempVIP) {
        return "temp vip";
    } else if (isVIP) {
        return "vip";
    } else if (submissionCount === 0) {
        return "new";
    } else {
        return "other";
    }
}

function getVoteAuthor(submissionCount: number, isTempVIP: boolean, isVIP: boolean, isOwnSubmission: boolean): string {
    if (isOwnSubmission) {
        return "Report by Submitter";
    } else if (isTempVIP) {
        return "Report by Temp VIP";
    } else if (isVIP) {
        return "Report by VIP User";
    } else if (submissionCount === 0) {
        return "Report by New User";
    }

    return "";
}

const voteAuthorMap: Record<authorType, string> = {
    "self": "Report by Submitter",
    "temp vip": "Report by Temp VIP",
    "vip": "Report by VIP User",
    "new": "Report by New User",
    "other": ""
};

const createDiscordVoteEmbed = (data: WebhookData) => {
    const startTime = Math.max(0, data.submission.startTime - 2);
    const startTimeParam = startTime > 0 ? `&t=${startTime}s` : "";
    return {
        title: data.video.title,
        url: `https://www.youtube.com/watch?v=${data.video.id}${startTimeParam}#requiredSegment=${data.submission.UUID}`,
        description: `**${data.votes.before} Votes Prior | \
            ${(data.votes.after)} Votes Now | ${data.submission.views} \
            Views**\n\n**Locked**: ${data.submission.locked}\n\n**Submission ID:** ${data.submission.UUID}\
            \n**Category:** ${data.submission.category}\
            \n\n**Submitted by:** ${data.submission.user.username}\n${data.submission.user.UUID}\
            \n\n**Total User Submissions:** ${data.submission.user.submissions.total}\
            \n**Ignored User Submissions:** ${data.submission.user.submissions.ignored}\
            \n\n**Timestamp:** \
            ${getFormattedTime(data.submission.startTime)} to ${getFormattedTime(data.submission.endTime)}`,
        color: 10813440,
        author: {
            name: data.authorName ?? `${voteAuthorMap[data.user.status]}${data.submission.locked ? " (Locked)" : ""}`,
        },
        thumbnail: {
            url: data.video.thumbnail,
        },
    };
};

function dispatchEvent(scope: string, data: WebhookData): void {
    const webhooks = config.webhooks;
    if (webhooks === undefined || webhooks.length === 0) return;
    Logger.debug("Dispatching webhooks");

    for (const webhook of webhooks) {
        const webhookURL = webhook.url;
        const authKey = webhook.key;
        const scopes = webhook.scopes || [];
        if (!scopes.includes(scope.toLowerCase())) return;

        axios.request({
            url: webhookURL,
            method: "POST",
            data,
            headers: {
                "Authorization": authKey,
                "Event-Type": scope, // Maybe change this in the future?
                "Content-Type": "application/json"
            }
        }).catch(err => {
            Logger.warn(`Couldn't send webhook to ${webhook.url}`);
            Logger.warn(err);
        });
    }
}

export {
    getVoteAuthorRaw,
    getVoteAuthor,
    dispatchEvent,
    createDiscordVoteEmbed
};