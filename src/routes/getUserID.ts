import { db } from "../databases/databases";
import { Request, Response } from "express";
import { UserID } from "../types/user.model";

function getFuzzyUserID(userName: string): Promise<{userName: string, userID: UserID }[]>  {
    // escape [_ % \] to avoid ReDOS
    userName = userName.replace(/\\/g, "\\\\")
        .replace(/_/g, "\\_")
        .replace(/%/g, "\\%");
    userName = `%${userName}%`; // add wildcard to username
    // LIMIT to reduce overhead | ESCAPE to escape LIKE wildcards
    try {
        return db.prepare("all", `SELECT "userName", "userID" FROM "userNames" WHERE "userName"
        LIKE ? ESCAPE '\\' LIMIT 10`, [userName]);
    } catch (err) {
        return null;
    }
}

function getExactUserID(userName: string): Promise<{userName: string, userID: UserID }[]>  {
    try {
        return db.prepare("all", `SELECT "userName", "userID" from "userNames" WHERE "userName" = ? LIMIT 10`, [userName]);
    } catch (err) {
        return null;
    }
}

export async function getUserID(req: Request, res: Response): Promise<Response> {
    const userName = req.query.username as string;
    const exactSearch = req.query.exact
        ? req.query.exact == "true"
        : false as boolean;

    // if not exact and length is 1, also skip
    if (userName == undefined || userName.length > 64 ||
        (!exactSearch && userName.length < 3)) {
        // invalid request
        return res.sendStatus(400);
    }
    const results = exactSearch
        ? await getExactUserID(userName)
        : await getFuzzyUserID(userName);

    if (results === undefined || results === null) {
        return res.sendStatus(500);
    } else if (results.length === 0) {
        return res.sendStatus(404);
    } else {
        return res.send(results);
    }
}
