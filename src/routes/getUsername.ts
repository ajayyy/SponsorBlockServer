import { db } from "../databases/databases";
import { getHashCache } from "../utils/getHashCache";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";

export async function getUsername(req: Request, res: Response): Promise<Response> {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    userID = await getHashCache(userID);

    try {
        const row = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID], { useReplica: true });

        if (row !== undefined) {
            return res.send({
                userName: row.userName,
            });
        } else {
            //no username yet, just send back the userID
            return res.send({
                userName: userID,
            });
        }
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}
