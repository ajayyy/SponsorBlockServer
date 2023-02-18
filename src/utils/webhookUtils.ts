import { config } from "../config";
import { Logger } from "../utils/logger";
import { authorType, WebhookData } from "../types/webhook.model";
import { getFormattedTime } from "../utils/getFormattedTime";
import axios from "axios";

function getVoteAuthorRaw(submissionCount: number, isTempVIP: boolean, isVIP: boolean, isOwnSubmission: boolean): authorType {
    if (isOwnSubmission) return authorType.Self;
    else if (isTempVIP) return authorType.TempVIP;
    else if (isVIP) return authorType.VIP;
    else if (submissionCount === 0) authorType.New;
    else return authorType.Other;
}

const voteAuthorMap: Record<authorType, string> = {
    [authorType.Self]: "Report by Submitter",
    [authorType.TempVIP]: "Report by Temp VIP",
    [authorType.VIP]: "Report by VIP User",
    [authorType.New]: "Report by New User",
    [authorType.Other]: ""
};

const youtubeUrlCreator = (videoId: string, startTime: number, uuid: string): string => {
    const startTimeNumber = Math.max(0, startTime - 2);
    const startTimeParam = startTime > 0 ? `&t=${startTimeNumber}s` : "";
    return `https://www.youtube.com/watch?v=${videoId}${startTimeParam}#requiredSegment=${uuid}`;
};

const createDiscordVoteEmbed = (data: WebhookData) => ({
    title: data.video.title,
    url: youtubeUrlCreator(data.video.id, data.submission.startTime, data.submission.UUID),
    description: `**${data.votes.before} Votes Prior | \
        ${(data.votes.after)} Votes Now | ${data.submission.views} \
        Views**\n\n**Locked**: ${data.submission.locked}\n\n**Submission ID:** ${data.submission.UUID}\
        \n**Category:** ${data.submission.category}\
        \n\n**Submitted by:** ${data.submission.user.username}\n${data.submission.user.userID}\
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
});

export const createDiscordSegmentEmbed = (data: WebhookData) => ({
    title: data.video.title,
    url: youtubeUrlCreator(data.video.id, data.submission.startTime, data.submission.UUID),
    description: `Submission ID: ${data.submission.UUID}\
        \n\nTimestamp: \
        ${getFormattedTime(data.submission.startTime)} to ${getFormattedTime(data.submission.endTime)}\
        \n\nCategory: ${data.submission.category}`,
    color: 10813440,
    author: {
        name: data.submission.user.userID,
    },
    thumbnail: {
        url: data.video.thumbnail
    },
});


function dispatchEvent(scope: string, data: WebhookData): void {
    const webhooks = config.webhooks;
    if (!webhooks?.length) return;
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
    dispatchEvent,
    createDiscordVoteEmbed
};