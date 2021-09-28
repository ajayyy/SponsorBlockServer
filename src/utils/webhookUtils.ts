import { config } from "../config";
import { Logger } from "../utils/logger";
import axios from "axios";

function getVoteAuthorRaw(submissionCount: number, isVIP: boolean, isOwnSubmission: boolean): string {
    if (isOwnSubmission) {
        return "self";
    } else if (isVIP) {
        return "vip";
    } else if (submissionCount === 0) {
        return "new";
    } else {
        return "other";
    }
}

function getVoteAuthor(submissionCount: number, isVIP: boolean, isOwnSubmission: boolean): string {
    if (submissionCount === 0) {
        return "Report by New User";
    } else if (isOwnSubmission) {
        return "Report by Submitter";
    } else if (isVIP) {
        return "Report by VIP User";
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

export {
    getVoteAuthorRaw,
    getVoteAuthor,
    dispatchEvent,
};
