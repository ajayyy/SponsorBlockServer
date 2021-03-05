import {db} from '../databases/databases';
import { HashedUserID } from '../types/user.model';

export async function isUserVIP(userID: HashedUserID): Promise<boolean> {
    return (await db.prepare('get', `SELECT count(*) as "userCount" FROM "vipUsers" WHERE "userID" = ?`, [userID])).userCount > 0;
}


