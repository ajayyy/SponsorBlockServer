#!/bin/sh
set -e
echo 'Entrypoint script'
cd /usr/src/app
cp /etc/sponsorblock/config.json . || cat <<EOF > config.json
{
    "port": 8080,
    "globalSalt": "[CHANGE THIS]",
    "adminUserID": "[CHANGE THIS]",
    "youtubeAPIKey": null,
    "discordReportChannelWebhookURL": null, 
    "discordFirstTimeSubmissionsWebhookURL": null, 
    "discordAutoModWebhookURL": null,
    "proxySubmission": null,
    "behindProxy": "X-Forwarded-For",
    "db": "./databases/sponsorTimes.db",
    "privateDB": "./databases/private.db",
    "createDatabaseIfNotExist": true,
    "schemaFolder": "./databases",
    "dbSchema": "./databases/_sponsorTimes.db.sql",
    "privateDBSchema": "./databases/_private.db.sql",
    "mode": "development",
    "readOnly": false
}
EOF
node dist/index.js
