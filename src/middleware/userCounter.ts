import fetch from "node-fetch";
import { Logger } from "../utils/logger.js";
import { config } from "../config.js";
import { getIP } from "../utils/getIP.js";
import { getHash } from "../utils/getHash.js";
import { NextFunction, Request, Response } from "express";

export function userCounter(req: Request, res: Response, next: NextFunction): void {
    fetch(`${config.userCounterURL}/api/v1/addIP?hashedIP=${getHash(getIP(req), 1)}`, { method: "POST" })
        .catch(() => Logger.debug(`Failing to connect to user counter at: ${config.userCounterURL}`));

    next();
}
