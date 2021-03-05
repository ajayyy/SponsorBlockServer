import {db, privateDB} from '../databases/databases';
import {getHash} from '../utils/getHash';
import {Request, Response} from 'express';

export async function shadowBanUser(req: Request, res: Response) {
    const userID = req.query.userID as string;
    const hashedIP = req.query.hashedIP as string;
    let adminUserIDInput = req.query.adminUserID as string;

    const enabled = req.query.enabled === undefined
        ? false
        : req.query.enabled === 'true';

    //if enabled is false and the old submissions should be made visible again
    const unHideOldSubmissions = req.query.unHideOldSubmissions !== "false";

    if (adminUserIDInput == undefined || (userID == undefined && hashedIP == undefined)) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    adminUserIDInput = getHash(adminUserIDInput);

    const isVIP = (await db.prepare("get", `SELECT count(*) as "userCount" FROM "vipUsers" WHERE "userID" = ?`, [adminUserIDInput])).userCount > 0;
    if (!isVIP) {
        //not authorized
        res.sendStatus(403);
        return;
    }

    if (userID) {
        //check to see if this user is already shadowbanned
        const row = await privateDB.prepare('get', `SELECT count(*) as "userCount" FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);

        if (enabled && row.userCount == 0) {
            //add them to the shadow ban list

            //add it to the table
            await privateDB.prepare('run', `INSERT INTO "shadowBannedUsers" VALUES(?)`, [userID]);

            //find all previous submissions and hide them
            if (unHideOldSubmissions) {
                await db.prepare('run', `UPDATE "sponsorTimes" SET "shadowHidden" = 1 WHERE "userID" = ?
                                AND NOT EXISTS ( SELECT "videoID", "category" FROM "noSegments" WHERE
                                "sponsorTimes.videoID" = "noSegments.videoID" AND "sponsorTimes.category" = "noSegments.category")`, [userID]);
            }
        } else if (!enabled && row.userCount > 0) {
            //remove them from the shadow ban list
            await privateDB.prepare('run', `DELETE FROM "shadowBannedUsers" WHERE userID = ?`, [userID]);

            //find all previous submissions and unhide them
            if (unHideOldSubmissions) {
                let segmentsToIgnore = (await db.prepare('all', `SELECT UUID FROM "sponsorTimes" st
                                JOIN "noSegments" ns on "st.videoID" = "ns.videoID" AND st.category = ns.category WHERE "st.userID" = ?`
                                    , [userID])).map((item: {UUID: string}) => item.UUID);
                let allSegments = (await db.prepare('all', `SELECT "UUID" FROM "sponsorTimes" st WHERE "st.userID" = ?`, [userID]))
                                        .map((item: {UUID: string}) => item.UUID);

                allSegments.filter((item: {uuid: string}) => {
                    return segmentsToIgnore.indexOf(item) === -1;
                }).forEach((UUID: string) => {
                    db.prepare('run', `UPDATE "sponsorTimes" SET "shadowHidden" = 0 WHERE "UUID" = ?`, [UUID]);
                });
            }
        }
    }
    else if (hashedIP) {
        //check to see if this user is already shadowbanned
        // let row = await privateDB.prepare('get', "SELECT count(*) as userCount FROM shadowBannedIPs WHERE hashedIP = ?", [hashedIP]);

        // if (enabled && row.userCount == 0) {
        if (enabled) {
            //add them to the shadow ban list

            //add it to the table
            // await privateDB.prepare('run', "INSERT INTO shadowBannedIPs VALUES(?)", [hashedIP]);


            //find all previous submissions and hide them
            if (unHideOldSubmissions) {
                await db.prepare('run', `UPDATE "sponsorTimes" SET "shadowHidden" = 1 WHERE "timeSubmitted" IN
                    (SELECT "privateDB.timeSubmitted" FROM "sponsorTimes" LEFT JOIN "privateDB.sponsorTimes" as "privateDB" ON "sponsorTimes.timeSubmitted"="privateDB.timeSubmitted"
                    WHERE "privateDB.hashedIP" = ?)`, [hashedIP]);
            }
        } /*else if (!enabled && row.userCount > 0) {
            // //remove them from the shadow ban list
            // await privateDB.prepare('run', "DELETE FROM shadowBannedUsers WHERE userID = ?", [userID]);

            // //find all previous submissions and unhide them
            // if (unHideOldSubmissions) {
            //     await db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?", [userID]);
            // }
        }*/
    }

    res.sendStatus(200);
}
