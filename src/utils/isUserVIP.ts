import { db } from "../databases/databases.js";
import { HashedUserID } from "../types/user.model.js";

export async function isUserVIP(userID: HashedUserID): Promise<boolean> {
    return (await db.prepare("get", `SELECT count(*) as "userCount" FROM "vipUsers" WHERE "userID" = ? LIMIT 1`, [userID])).userCount > 0;
}
