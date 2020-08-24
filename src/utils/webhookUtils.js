const config = require('../config.js');
const logger = require('../utils/logger.js');
const request = require('request');

function getVoteAuthorRaw(submissionCount, isVIP, isOwnSubmission) {
    if (isOwnSubmission) {
        return "self";
    } else if (isVIP) {
        return "vip";
    } else if (submissionCount === 0) {
        return "new";
    } else {
        return "other";
    };
};

function getVoteAuthor(submissionCount, isVIP, isOwnSubmission) {
    if (submissionCount === 0) {
        return "Report by New User";
    } else if (isVIP) {
        return "Report by VIP User";
    } else if (isOwnSubmission) {
        return "Report by Submitter";
    }

    return "";
}

function dispatchEvent(scope, data) {
    let webhooks = config.webhooks;
    if (webhooks === undefined || webhooks.length === 0) return;
    logger.debug("Dispatching webhooks");
    webhooks.forEach(webhook => {
        let webhookURL = webhook.url;
        let authKey = webhook.key;
        let scopes = webhook.scopes || [];
        if (!scopes.includes(scope.toLowerCase())) return;
        request.post(webhookURL, {json: data, headers: {
            "Authorization": authKey,
            "Event-Type": scope // Maybe change this in the future? 
        }}).on('error', (e) => {
            logger.warn('Couldn\'t send webhook to ' + webhook.url);
            logger.warn(e);
        });
    });
}

module.exports = {
    getVoteAuthorRaw,
    getVoteAuthor,
    dispatchEvent
}