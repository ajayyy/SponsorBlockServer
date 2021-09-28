import { NextFunction, Request, Response } from "express";

export function apiCspMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.header("Content-Security-Policy", "script-src 'none'; object-src 'none'");
    next();
}