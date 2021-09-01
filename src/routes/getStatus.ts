import {db} from "../databases/databases";
import {Logger} from "../utils/logger";
import {Request, Response} from "express";

export async function getStatus(req: Request, res: Response): Promise<Response> {
    try {
        const dbVersion = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;

        return res.send({
            uptime: process.uptime(),
            commit: (global as any).HEADCOMMIT || "unknown",
            db: Number(dbVersion),
        });
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}
