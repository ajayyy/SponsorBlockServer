import axios from "axios";
import { Logger } from "../utils/logger";
import { config } from "../config";
import { getIP } from "../utils/getIP";
import { NextFunction, Request, Response } from "express";
import { Agent } from "http";

const httpAgent = new Agent({ keepAlive: true });

export function userCounter(req: Request, res: Response, next: NextFunction): void {
    if (req.method !== "OPTIONS") {
        if (Math.random() < 1 / config.userCounterRatio) {
            axios({
                method: "post",
                url: `${config.userCounterURL}/api/v1/addIP?hashedIP=${getIP(req, true)}`,
                httpAgent
            }).catch(() => /* instanbul skip next */ Logger.debug(`Failing to connect to user counter at: ${config.userCounterURL}`));
        }
    }

    next();
}
