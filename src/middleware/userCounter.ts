import axios from "axios";
import { Logger } from "../utils/logger";
import { config } from "../config";
import { getIP } from "../utils/getIP";
import { getHash } from "../utils/getHash";
import { NextFunction, Request, Response } from "express";

export function userCounter(req: Request, res: Response, next: NextFunction): void {
    axios.post(`${config.userCounterURL}/api/v1/addIP?hashedIP=${getHash(getIP(req), 1)}`)
        .catch(() => Logger.debug(`Failing to connect to user counter at: ${config.userCounterURL}`));

    next();
}
