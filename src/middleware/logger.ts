import { NextFunction, Request, Response } from "express";

import { Logger } from "#utils/logger";

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    Logger.info(`Request received: ${req.method} ${req.url}`);
    next();
}
