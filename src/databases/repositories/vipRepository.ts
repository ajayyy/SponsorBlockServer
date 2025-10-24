import { HashedUserID } from "../../types/user.model";
import { db } from "../databases";
import { IDatabase } from "../IDatabase";
import { VipUser } from "../models";
import { PrivateTempVipLog } from "../models/private/tempVipLog";

export class VipRepository {
    public static async addVip(hashedUserId: HashedUserID, publicDb: IDatabase): Promise<void> {
        const vipUser = new VipUser({ userID: hashedUserId });

        await publicDb.prepare("run", 'INSERT INTO "vipUsers" VALUES(?)', [vipUser.userID]);
    }

    public static async deleteVip(hashedUserId: HashedUserID, publicDb: IDatabase): Promise<void> {
        const vipUser = new VipUser({ userID: hashedUserId });

        await publicDb.prepare("run", 'DELETE FROM "vipUsers" WHERE "userID" = ?', [vipUser.userID]);
    }

    public static async addTempVip(adminUserId: string, userId: string, privateDb: IDatabase): Promise<void> {
        const tempVipLog = new PrivateTempVipLog({
            issuerUserID: adminUserId,
            targetUserID: userId,
            enabled: true,
            updatedAt: Date.now()
        });

        await privateDb.prepare(
            "run",
            `INSERT INTO "tempVipLog" VALUES (?, ?, ?, ?)`,
            [tempVipLog.issuerUserID, tempVipLog.targetUserID, + tempVipLog.enabled, tempVipLog.updatedAt]
        );
    }

    public static async removeTempVip(adminUserId: string, userId: string, privateDb: IDatabase): Promise<void> {
        const tempVipLog = new PrivateTempVipLog({
            issuerUserID: adminUserId,
            targetUserID: userId,
            enabled: false,
            updatedAt: Date.now()
        });

        await privateDb.prepare(
            "run",
            `INSERT INTO "tempVipLog" VALUES (?, ?, ?, ?)`,
            [tempVipLog.issuerUserID, tempVipLog.targetUserID, + tempVipLog.enabled, tempVipLog.updatedAt]
        );
    }
}
