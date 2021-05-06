import {NextFunction, Request, Response} from 'express';

export function apiCspMiddleware(req: Request, res: Response, next: NextFunction) {
    res.header("Content-Security-Policy", "script-src 'none'");
    next();
}