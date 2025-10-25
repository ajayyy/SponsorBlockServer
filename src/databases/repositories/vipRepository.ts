import type { IDatabase } from "../IDatabase";
import { VipUser } from "../models";
import { PrivateTempVipLog } from "../models/private";

export class VipRepository {
    private publicDb: IDatabase;
    private privateDb: IDatabase;

    constructor(publicDb: IDatabase, privateDb: IDatabase) {
        this.publicDb = publicDb;
        this.privateDb = privateDb;
    }

    /**
     * Creates a new VIP user.
     */
    public async create(vipUser: VipUser): Promise<void> {
        await this.publicDb.prepare("run", 'INSERT INTO "vipUsers" VALUES(?)', [vipUser.userID]);
    }

    /**
     * Deletes a VIP user. 
     */
    public async delete(vipUser: VipUser): Promise<void> {
        await this.publicDb.prepare("run", 'DELETE FROM "vipUsers" WHERE "userID" = ?', [vipUser.userID]);
    }

    /**
     * Adds a new log entry to the temporary VIP log.
     */
    public async addTempVipLog(tempVipLog: PrivateTempVipLog): Promise<void> {
        await this.privateDb.prepare(
            "run",
            `INSERT INTO "tempVipLog" VALUES (?, ?, ?, ?)`,
            [tempVipLog.issuerUserID, tempVipLog.targetUserID, + tempVipLog.enabled, tempVipLog.updatedAt]
        );
    }
}
