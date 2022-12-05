import axios from "axios";
import { Logger } from "../utils/logger";
import { config } from "../config";
import { getIP } from "../utils/getIP";
import { NextFunction, Request, Response } from "express";

export function userCounter(req: Request, res: Response, next: NextFunction): void {
    if (req.method !== "OPTIONS") {
        axios.post(`${config.userCounterURL}/api/v1/addIP?hashedIP=${getIP(req)}`)
            .catch(() => Logger.debug(`Failing to connect to user counter at: ${config.userCounterURL}`));
    }

    next();
}
