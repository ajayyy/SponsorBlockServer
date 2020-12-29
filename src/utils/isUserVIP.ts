import {db} from '../databases/databases';
import { HashedUserID } from '../types/user.model';

export function isUserVIP(userID: HashedUserID): boolean {
    return db.prepare('get', "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [userID]).userCount > 0;
}


