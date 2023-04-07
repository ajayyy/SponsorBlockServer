import { NextFunction, Request, Response } from "express";
import os from "os";

export function hostHeader(req: Request, res: Response, next: NextFunction): void {
    res.header("SBSERVER-HOST", os.hostname());
    next();
}