import {db} from '../databases/databases';

export function isUserVIP(userID: string): boolean {
    return db.prepare('get', "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [userID]).userCount > 0;
}


