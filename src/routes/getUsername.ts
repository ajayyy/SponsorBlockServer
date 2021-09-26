import { db } from "../databases/databases";
import { getHash } from "../utils/getHash";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";

export async function getUsername(req: Request, res: Response): Promise<Response> {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    userID = getHash(userID);

    try {
        const row = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID]);

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
