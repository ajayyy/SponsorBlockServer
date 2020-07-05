#!/bin/bash
set -e
echo 'Entrypoint script'
cd /usr/src/app
cp /etc/sponsorblock/config.json . || cat <<EOF > config.json
{
    "port": 8080,
    "mysql": {
        "host": "127.0.0.1",
        "port": 3306,
        "database": "sponsorblock",
        "user": "sponsorblock",
        "password": "sponsorblock"
    },
    "privateMysql": {
        "host": "127.0.0.1",
        "port": 3306,
        "database": "sponsorblock_private",
        "user": "sponsorblock",
        "password": "sponsorblock"
    },
    "globalSalt": "",
    "adminUserID": "",
    "youtubeAPIKey": "",
    "discordReportChannelWebhookURL": null, 
    "discordFirstTimeSubmissionsWebhookURL": null, 
    "discordAutoModWebhookURL": null,
    "behindProxy": true,
    "db": null,
    "privateDB": null,
    "createDatabaseIfNotExist": true,
    "schemaFolder": null,
    "dbSchema": null,
    "privateDBSchema": null,
    "mode": "development",
    "readOnly": false
}
EOF
node index.js