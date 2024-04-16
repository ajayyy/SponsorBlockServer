import { Request, Response } from "express";
import { Server } from "http";
import { config } from "../config";

export async function getReady(req: Request, res: Response, server: Server): Promise<Response> {
    const connections = await new Promise((resolve) => server.getConnections((_, count) => resolve(count))) as number;

    if (!connections || connections < config.maxConnections) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(500);
    }
}
