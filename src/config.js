
const fs = require('fs');
let config = {};

// Check to see if launched in test mode
if (process.env.npm_lifecycle_script === 'node test.js') {
  config = JSON.parse(fs.readFileSync('test.json'));
} else {
  config = JSON.parse(fs.readFileSync('config.json'));
}

addDefaults(config, {
  "port": 80,
  "behindProxy": "X-Forwarded-For",
  "db": "./databases/sponsorTimes.db",
  "privateDB": "./databases/private.db",
  "createDatabaseIfNotExist": true,
  "schemaFolder": "./databases",
  "dbSchema": "./databases/_sponsorTimes.db.sql",
  "privateDBSchema": "./databases/_private.db.sql",
  "readOnly": false,
  "webhooks": [],
  "categoryList": ["sponsor", "intro", "outro", "interaction", "selfpromo", "music_offtopic"],
  "maxNumberOfActiveWarnings": 3,
  "hoursAfterWarningExpires": 24
})

module.exports = config;

// Add defaults
function addDefaults(config, defaults) {
  for (const key in defaults) {
      if(!config.hasOwnProperty(key)) {
        config[key] = defaults[key];
      }
  }
};