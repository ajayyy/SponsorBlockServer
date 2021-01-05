import {config} from '../config';
import {Logger} from '../utils/logger';
import fetch from 'node-fetch';

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

function dispatchEvent(scope: string, data: any): void {
    let webhooks = config.webhooks;
    if (webhooks === undefined || webhooks.length === 0) return;
    Logger.debug("Dispatching webhooks");
    webhooks.forEach(webhook => {
        let webhookURL = webhook.url;
        let authKey = webhook.key;
        let scopes = webhook.scopes || [];
        if (!scopes.includes(scope.toLowerCase())) return;

        fetch(webhookURL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                "Authorization": authKey,
                "Event-Type": scope, // Maybe change this in the future?
            },
        })
        .catch(err => {
            Logger.warn('Couldn\'t send webhook to ' + webhook.url);
            Logger.warn(e.message);
        });
    });
}

export {
    getVoteAuthorRaw,
    getVoteAuthor,
    dispatchEvent,
};
