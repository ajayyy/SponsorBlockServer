import { NextFunction, Request, Response } from "express";

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
    next();
}
