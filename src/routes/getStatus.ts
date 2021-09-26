import { db } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";

export async function getStatus(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();
    let value = req.params.value as string[] | string;
    value = Array.isArray(value) ? value[0] : value;
    try {
        const dbVersion = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        const statusValues: Record<string, any> = {
            uptime: process.uptime(),
            commit: (global as any).HEADCOMMIT || "unknown",
            db: Number(dbVersion),
            startTime,
            processTime: Date.now() - startTime,
        };
        return value ? res.send(String(statusValues[value])) : res.send(statusValues);
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}
