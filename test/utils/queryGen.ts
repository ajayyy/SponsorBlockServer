import { IDatabase } from "../../src/databases/IDatabase";
import { HashedUserID } from "../../src/types/user.model";
import { usernameUserArray } from "./genUser";

export const insertUsername = async (db: IDatabase, userID: HashedUserID, userName: string, locked = false) => {
    const query = 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)';
    const lockedValue = Number(locked);
    await db.prepare("run", query, [userID, userName, lockedValue]);
};

export const insertUsernameBulk = async (db: IDatabase, users: usernameUserArray) => {
    const query = 'INSERT INTO "userNames" ("userID", "userName", "locked") VALUES(?, ?, ?)';
    for (const user of Object.values(users))
        await db.prepare("run", query, [user.pubID, user.username, 0]);
};