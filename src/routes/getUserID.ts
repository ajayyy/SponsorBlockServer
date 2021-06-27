import {db} from '../databases/databases';
import {Request, Response} from 'express';
import {UserID} from '../types/user.model';

function getFuzzyUserID(userName: String): Promise<{userName: String, userID: UserID }[]>  {
    // escape [_ % \] to avoid ReDOS
    userName = userName.replace(/\\/g, '\\\\')
        .replace(/_/g, '\\_')
        .replace(/%/g, '\\%');
    userName = `%${userName}%`; // add wildcard to username
    // LIMIT to reduce overhead | ESCAPE to escape LIKE wildcards
    try {
        return db.prepare('all', `SELECT "userName", "userID" FROM "userNames" WHERE "userName"
        LIKE ? ESCAPE '\\' LIMIT 10`, [userName])
    } catch (err) {
        return null;
    }
}

function getExactUserID(userName: String): Promise<{userName: String, userID: UserID }[]>  {
    try {
        return db.prepare('all', `SELECT "userName", "userID" from "userNames" WHERE "userName" = ? LIMIT 10`, [userName]);
    } catch (err) {
        return null;
    }
}

export async function getUserID(req: Request, res: Response) {
    let userName = req.query.username as string;
    const exactSearch = req.query.exact
        ? req.query.exact == "true"
        : false as Boolean;
    
    // if not exact and length is 1, also skip
    if (userName == undefined || userName.length > 64 ||
        (!exactSearch && userName.length < 3)) {
        // invalid request
        res.sendStatus(400);
        return false;
    }
    const results = exactSearch
        ? await getExactUserID(userName)
        : await getFuzzyUserID(userName);

    if (results === undefined || results === null) {
        res.sendStatus(500);
        return false;
    } else if (results.length === 0) {
        res.sendStatus(404);
        return false;
    } else {
        res.send(results);
        return false;
    }
}
