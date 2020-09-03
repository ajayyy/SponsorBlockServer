const config = require('../config.js');

const levels = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG"
};

const colors = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
}

const settings = {
  ERROR: true,
  WARN: true,
  INFO: false,
  DEBUG: false
};

if (config.mode === 'development') {
  settings.INFO = true;
  settings.DEBUG = true;
} else if (config.mode === 'test') {
  settings.WARN = false;
}

function log(level, string) {
  if (!!settings[level]) {
    let color = colors.Bright;
    if (level === levels.ERROR) color = colors.FgRed;
    if (level === levels.WARN) color = colors.FgYellow;

    if (level.length === 4) {level = level + " "}; // ensure logs are aligned
    console.log(colors.Dim, level + " " + new Date().toISOString() + ": ", color, string, colors.Reset);
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