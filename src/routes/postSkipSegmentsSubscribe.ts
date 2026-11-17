import { Request, Response } from "express";
import { db } from "../databases/databases";

export async function postSkipSegmentSubscribe(req: Request, res: Response): Promise<Response> {
    const subscribeAuth: string = req.body.subscribeAuth;
    const categories: string[] = req.body.categories;
    const actionTypes: string[] = req.body.actionTypes;
    const prefixSize: number = req.body.prefixSize;
    const url = req.body.url;

    if (!subscribeAuth || !categories || !actionTypes || !prefixSize || !url || categories.length === 0 || actionTypes.length === 0) {
        return res.status(400).send("Missing parameters");
    }

    const authExists = await db.prepare("get", `SELECT 1 FROM "skipSegmentsSubscriptions" WHERE "subscribeAuth" = ?`, [subscribeAuth]);

    if (authExists) {
        await db.prepare("run", `UPDATE "skipSegmentsSubscriptions" SET "categories" = ?, "actionTypes" = ?, "prefixSize" = ?, "url" = ? WHERE "subscribeAuth" = ?`, [JSON.stringify(categories), JSON.stringify(actionTypes), prefixSize, url, subscribeAuth]);
        return res.status(200).send("Success");
    } else {
        return res.status(401).send("Invalid subscription auth");
    }
}
