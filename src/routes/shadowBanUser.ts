import {db} from "../databases/databases";
import {getHash} from "../utils/getHash";
import {Request, Response} from "express";
import { config } from "../config";
import { Category, Service, VideoID, VideoIDHash } from "../types/segments.model";
import { HashedUserID, UserID } from "../types/user.model";
import { QueryCacher } from "../utils/queryCacher";
import { isUserVIP } from "../utils/isUserVIP";

export async function shadowBanUser(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as string;
    const hashedIP = req.query.hashedIP as string;
    let adminUserIDInput = req.query.adminUserID as string;

    const enabled = req.query.enabled === undefined
        ? true
        : req.query.enabled === "true";

    //if enabled is false and the old submissions should be made visible again
    const unHideOldSubmissions = req.query.unHideOldSubmissions !== "false";

    const categories: string[] = req.query.categories ? JSON.parse(req.query.categories as string) : config.categoryList;
    categories.filter((category) => typeof category === "string" && !(/[^a-z|_|-]/.test(category)));

    if (adminUserIDInput == undefined || (userID == undefined && hashedIP == undefined)) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    adminUserIDInput = getHash(adminUserIDInput);

    const isVIP = await isUserVIP(adminUserIDInput as HashedUserID);
    if (!isVIP) {
        //not authorized
        return res.sendStatus(403);
    }

    if (userID) {
        //check to see if this user is already shadowbanned
        const row = await db.prepare("get", `SELECT count(*) as "userCount" FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);

        if (enabled && row.userCount == 0) {
            //add them to the shadow ban list

            //add it to the table
            await db.prepare("run", `INSERT INTO "shadowBannedUsers" VALUES(?)`, [userID]);

            //find all previous submissions and hide them
            if (unHideOldSubmissions) {
                await db.prepare("run", `UPDATE "sponsorTimes" SET "shadowHidden" = 1 WHERE "userID" = ? AND "category" in (${categories.map((c) => `'${c}'`).join(",")})
                                AND NOT EXISTS ( SELECT "videoID", "category" FROM "lockCategories" WHERE
                                "sponsorTimes"."videoID" = "lockCategories"."videoID" AND "sponsorTimes"."category" = "lockCategories"."category")`, [userID]);

                // clear cache for all old videos
                (await db.prepare("all", `SELECT "videoID", "hashedVideoID", "service", "votes", "views" FROM "sponsorTimes" WHERE "userID" = ?`, [userID]))
                    .forEach((videoInfo: {category: Category, videoID: VideoID, hashedVideoID: VideoIDHash, service: Service, userID: UserID}) => {
                        QueryCacher.clearVideoCache(videoInfo);
                    }
                    );
            }
        } else if (!enabled && row.userCount > 0) {
            //remove them from the shadow ban list
            await db.prepare("run", `DELETE FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);

            //find all previous submissions and unhide them
            if (unHideOldSubmissions) {
                const segmentsToIgnore = (await db.prepare("all", `SELECT "UUID" FROM "sponsorTimes" st
                    JOIN "lockCategories" ns on "st"."videoID" = "ns"."videoID" AND st.category = ns.category WHERE "st"."userID" = ?`
                , [userID])).map((item: {UUID: string}) => item.UUID);
                const allSegments = (await db.prepare("all", `SELECT "UUID" FROM "sponsorTimes" st WHERE "st"."userID" = ?`, [userID]))
                    .map((item: {UUID: string}) => item.UUID);

                await Promise.all(allSegments.filter((item: {uuid: string}) => {
                    return segmentsToIgnore.indexOf(item) === -1;
                }).map(async (UUID: string) => {
                    // collect list for unshadowbanning
                    (await db.prepare("all", `SELECT "videoID", "hashedVideoID", "service", "votes", "views", "userID" FROM "sponsorTimes" WHERE "UUID" = ? AND "shadowHidden" = 1 AND "category" in (${categories.map((c) => `'${c}'`).join(",")})`, [UUID]))
                        .forEach((videoInfo: {category: Category, videoID: VideoID, hashedVideoID: VideoIDHash, service: Service, userID: UserID}) => {
                            QueryCacher.clearVideoCache(videoInfo);
                        }
                        );

                    return db.prepare("run", `UPDATE "sponsorTimes" SET "shadowHidden" = 0 WHERE "UUID" = ? AND "category" in (${categories.map((c) => `'${c}'`).join(",")})`, [UUID]);
                }));
            }
        }
    } else if (hashedIP) {
        //check to see if this user is already shadowbanned
        // let row = await privateDB.prepare('get', "SELECT count(*) as userCount FROM shadowBannedIPs WHERE hashedIP = ?", [hashedIP]);

        // if (enabled && row.userCount == 0) {
        if (enabled) {
            //add them to the shadow ban list

            //add it to the table
            // await privateDB.prepare('run', "INSERT INTO shadowBannedIPs VALUES(?)", [hashedIP]);


            //find all previous submissions and hide them
            if (unHideOldSubmissions) {
                await db.prepare("run", `UPDATE "sponsorTimes" SET "shadowHidden" = 1 WHERE "timeSubmitted" IN
                    (SELECT "privateDB"."timeSubmitted" FROM "sponsorTimes" LEFT JOIN "privateDB"."sponsorTimes" as "privateDB" ON "sponsorTimes"."timeSubmitted"="privateDB"."timeSubmitted"
                    WHERE "privateDB"."hashedIP" = ?)`, [hashedIP]);
            }
        } /*else if (!enabled && row.userCount > 0) {
            // //remove them from the shadow ban list
            // await db.prepare('run', "DELETE FROM shadowBannedUsers WHERE userID = ?", [userID]);

            // //find all previous submissions and unhide them
            // if (unHideOldSubmissions) {
            //     await db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?", [userID]);
            // }
        }*/
    }
    return res.sendStatus(200);
}
