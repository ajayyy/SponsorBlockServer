const config = require('../config.js');

const levels = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG"
};

const settings = {
  ERROR: true,
  WARN: true,
  INFO: false,
  DEBUG: false
};

if (config.mode === 'development') {
  settings.INFO = true;
  settings.DEBUG = true;
}

function log(level, string) {
  if (!!settings[level]) {
    if (level.length === 4) {level = level + " "}; // ensure logs are aligned
    console.log(level + " " + new Date().toISOString() + " : " + string);
  }
}

module.exports = {
  levels,
  log,
  error: (string) => {log(levels.ERROR, string)},
  warn: (string) => {log(levels.WARN, string)},
  info: (string) => {log(levels.INFO, string)},
  debug: (string) => {log(levels.DEBUG, string)},
};