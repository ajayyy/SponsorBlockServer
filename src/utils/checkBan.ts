import { HashedUserID } from "../types/user.model.js";
import { db } from "../databases/databases.js";
import { Category, HashedIP } from "../types/segments.model.js";
import { announceBan, banUser } from "../routes/shadowBanUser.js";
import { config } from "../config.js";
import { Logger } from "./logger.js";

export async function isUserBanned(userID: HashedUserID): Promise<boolean> {
    return (await db.prepare("get", `SELECT 1 FROM "shadowBannedUsers" WHERE "userID" = ? LIMIT 1`, [userID], { useReplica: true })) !== undefined;
}

export async function isIPBanned(ip: HashedIP): Promise<boolean> {
    return (await db.prepare("get", `SELECT 1 FROM "shadowBannedIPs" WHERE "hashedIP" = ? LIMIT 1`, [ip], { useReplica: true })) !== undefined;
}

// NOTE: this function will propagate IP bans
export async function checkBanStatus(userID: HashedUserID, ip: HashedIP): Promise<boolean> {
    const [userBanStatus, ipBanStatus] = await Promise.all([isUserBanned(userID), isIPBanned(ip)]);

    if (!userBanStatus && ipBanStatus) {
        // Make sure the whole user is banned
        announceBan([userID]);
        banUser(userID, true, true, 1, config.categoryList as Category[], config.deArrowTypes)
            .catch((e) => Logger.error(`Error banning user after submitting from a banned IP: ${e}`));
    }
    return userBanStatus || ipBanStatus;
}
