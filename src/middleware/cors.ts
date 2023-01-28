import { NextFunction, Request, Response } from "express";

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, If-None-Match");
    next();
}
