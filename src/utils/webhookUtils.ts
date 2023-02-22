import { config } from "../config";
import { Logger } from "../utils/logger";
import axios from "axios";
import { HashedUserID } from "../types/user.model";

function getVoteAuthorRaw(submissionCount: number, isTempVIP: boolean, isVIP: boolean, isOwnSubmission: boolean): string {
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

function dispatchEvent(scope: string, data: Record<string, unknown>): void {
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

interface warningData {
    target: {
        userID: HashedUserID
        username: string | null
    },
    issuer: {
        userID: HashedUserID,
        username: string | null
    },
    reason: string
}

function generateWarningDiscord(data: warningData) {
    return {
        embeds: [
            {
                title: "Warning",
                description: `**User:** ${data.target.username} (${data.target.userID})\n**Issuer:** ${data.issuer.username} (${data.issuer.userID})\n**Reason:** ${data.reason}`,
                color: 0xff0000,
                timestamp: new Date().toISOString()
            }
        ]
    };
}

export {
    getVoteAuthorRaw,
    getVoteAuthor,
    dispatchEvent,
    generateWarningDiscord,
    warningData
};
