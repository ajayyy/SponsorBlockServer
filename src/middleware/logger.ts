import { Logger } from "../utils/logger";
import { NextFunction, Request, Response } from "express";

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    Logger.info(`Request received: ${req.method} ${req.url}`);
    next();
}
