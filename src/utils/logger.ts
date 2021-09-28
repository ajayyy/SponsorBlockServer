import { config } from "../config";

const enum LogLevel {
    ERROR = "ERROR",
    WARN = "WARN",
    INFO = "INFO",
    DEBUG = "DEBUG"
}

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
};


class Logger {
    private _settings = {
        ERROR: true,
        WARN: true,
        INFO: false,
        DEBUG: false,
    };

    constructor() {
        if (config.mode === "development") {
            this._settings.INFO = true;
            this._settings.DEBUG = true;
        } else if (config.mode === "test") {
            this._settings.WARN = false;
        }
    }

    error(str: string) {
        this.log(LogLevel.ERROR, str);
    }
    warn(str: string) {
        this.log(LogLevel.WARN, str);
    }
    info(str: string) {
        this.log(LogLevel.INFO, str);
    }
    debug(str: string) {
        this.log(LogLevel.DEBUG, str);
    }

    private log(level: LogLevel, str: string) {
        if (!this._settings[level]) {
            return;
        }

        let color = colors.Bright;
        if (level === LogLevel.ERROR) color = colors.FgRed;
        if (level === LogLevel.WARN) color = colors.FgYellow;

        let levelStr = level.toString();
        if (levelStr.length === 4) {
            levelStr += " ";  // ensure logs are aligned
        }
        console.log(colors.Dim, `${levelStr} ${new Date().toISOString()}: `, color, str, colors.Reset);
    }
}

const loggerInstance = new Logger();
export {
    loggerInstance as Logger
};
