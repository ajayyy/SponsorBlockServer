import { NextFunction, Request, Response } from "express";

import { Logger } from "#utils/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for express to treat this as an error handler
export function errorHandlerMiddleware(err: unknown, req: Request, res: Response, next: NextFunction): void {
    let msg = `Error thrown in handler of ${req.method} ${req.path}:`;
    if (typeof err == "object" && err instanceof Error) {
        msg = `${msg}\n${err.stack ?? err.message}`;
        if (err.cause != null && typeof err.cause === "object" && err.cause instanceof Error) {
            msg = `${msg}\n\nCaused by: ${err.cause.stack ?? err.cause.message}`;
        }
    } else {
        msg = `${msg}\nNon-error value: ${err}`;
    }
    Logger.error(msg);
    res.status(500).send("A server-side error was thrown while handling this request");
}
