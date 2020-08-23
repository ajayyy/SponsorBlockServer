const config = require("../config.js");
const logger = require('../utils/logger.js');
const request = require('request');


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
        }});
    });
}

module.exports = dispatchEvent;