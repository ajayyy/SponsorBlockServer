import { db, privateDB } from "../databases/databases";
import { getHashCache } from "../utils/getHashCache";
import { Request, Response } from "express";
import { config } from "../config";
import { Category, DeArrowType, HashedIP, Service, VideoID, VideoIDHash } from "../types/segments.model";
import { UserID } from "../types/user.model";
import { QueryCacher } from "../utils/queryCacher";
import { isUserVIP } from "../utils/isUserVIP";
import { parseCategories, parseDeArrowTypes } from "../utils/parseParams";
import { Logger } from "../utils/logger";

export async function shadowBanUser(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as UserID;
    const adminUserIDInput = req.query.adminUserID as UserID;
    const type = Number.parseInt(req.query.type as string ?? "1");
    if (isNaN(type)) {
        return res.sendStatus(400);
    }

    const enabled = req.query.enabled === undefined
        ? true
        : req.query.enabled === "true";
    const lookForIPs = req.query.lookForIPs2 === "true";

    //if enabled is false and the old submissions should be made visible again
    const unHideOldSubmissions = req.query.unHideOldSubmissions !== "false";

    const categories: Category[] = parseCategories(req, config.categoryList as Category[]);
    const deArrowTypes: DeArrowType[] = parseDeArrowTypes(req, config.deArrowTypes);

    if (adminUserIDInput == undefined || (userID == undefined || type <= 0)) {
        //invalid request
        return res.sendStatus(400);
    }

    try {
        //hash the userID
        const adminUserID = await getHashCache(adminUserIDInput);

        const isVIP = await isUserVIP(adminUserID);
        if (!isVIP) {
            //not authorized
            return res.sendStatus(403);
        }
        const result = await banUser(userID, enabled, unHideOldSubmissions, type, categories, deArrowTypes);

        if (enabled && lookForIPs) {
            const ipLoggingFixedTime = 1675295716000;
            const timeSubmitted = (await db.prepare("all", `SELECT "timeSubmitted" FROM "sponsorTimes" WHERE "timeSubmitted" > ? AND "userID" = ?`, [ipLoggingFixedTime, userID])) as { timeSubmitted: number }[];
            const ips = (await Promise.all(timeSubmitted.map((s) => {
                return privateDB.prepare("all", `SELECT "hashedIP" FROM "sponsorTimes" WHERE "timeSubmitted" = ?`, [s.timeSubmitted]) as Promise<{ hashedIP: HashedIP }[]>;
            }))).flat();

            await Promise.all([...new Set(ips.map((ip) => ip.hashedIP))].map((ip) => {
                return banIP(ip, unHideOldSubmissions, type, categories, deArrowTypes);
            }));
        }

        if (result) {
            res.sendStatus(result);
            return;
        }
        return res.sendStatus(200);
    } catch (e) {
        Logger.error(e as string);
        return res.sendStatus(500);
    }
}

export async function banUser(userID: UserID, enabled: boolean, unHideOldSubmissions: boolean,
    type: number, categories: Category[], deArrowTypes: DeArrowType[]): Promise<number> {
    //check to see if this user is already shadowbanned
    const row = await db.prepare("get", `SELECT count(*) as "userCount" FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);

    if (enabled && row.userCount == 0) {
        //add them to the shadow ban list

        //add it to the table
        await db.prepare("run", `INSERT INTO "shadowBannedUsers" VALUES(?)`, [userID]);

        //find all previous submissions and hide them
        if (unHideOldSubmissions) {
            await unHideSubmissionsByUser(categories, deArrowTypes, userID, type);
        }
    } else if (enabled && row.userCount > 0) {
        // apply unHideOldSubmissions if applicable
        if (unHideOldSubmissions) {
            await unHideSubmissionsByUser(categories, deArrowTypes, userID, type);
        } else {
            // otherwise ban already exists, send 409
            return 409;
        }
    } else if (!enabled && row.userCount > 0) {
        //find all previous submissions and unhide them
        if (unHideOldSubmissions) {
            await unHideSubmissionsByUser(categories, deArrowTypes, userID, 0);
        }

        //remove them from the shadow ban list
        await db.prepare("run", `DELETE FROM "shadowBannedUsers" WHERE "userID" = ?`, [userID]);
    } else if (row.userCount == 0) { // already shadowbanned
        // already not shadowbanned
        return 400;
    }
    return 200;
}

async function unHideSubmissionsByUser(categories: string[], deArrowTypes: DeArrowType[],
    userID: UserID, type = 1) {

    if (categories.length) {
        await db.prepare("run", `UPDATE "sponsorTimes" SET "shadowHidden" = '${type}' WHERE "userID" = ? AND "category" in (${categories.map((c) => `'${c}'`).join(",")})
                        AND NOT EXISTS ( SELECT "videoID", "category" FROM "lockCategories" WHERE
                        "sponsorTimes"."videoID" = "lockCategories"."videoID" AND "sponsorTimes"."service" = "lockCategories"."service" AND "sponsorTimes"."category" = "lockCategories"."category")`, [userID]);
    }

    // clear cache for all old videos
    (await db.prepare("all", `SELECT "category", "videoID", "hashedVideoID", "service", "userID" FROM "sponsorTimes" WHERE "userID" = ?`, [userID]))
        .forEach((videoInfo: { category: Category; videoID: VideoID; hashedVideoID: VideoIDHash; service: Service; userID: UserID; }) => {
            QueryCacher.clearSegmentCache(videoInfo);
        });

    if (deArrowTypes.includes("title")) {
        await db.prepare("run", `UPDATE "titleVotes" as tv SET "shadowHidden" = ${type} FROM "titles" t WHERE tv."UUID" = t."UUID" AND t."userID" = ?`,
            [userID]);
    }

    if (deArrowTypes.includes("thumbnail")) {
        await db.prepare("run", `UPDATE "thumbnailVotes" as tv SET "shadowHidden" = ${type} FROM "thumbnails" t WHERE tv."UUID" = t."UUID" AND t."userID" = ?`,
            [userID]);
    }

    (await db.prepare("all", `SELECT "videoID", "hashedVideoID", "service" FROM "titles" WHERE "userID" = ?`, [userID]))
        .forEach((videoInfo: { videoID: VideoID; hashedVideoID: VideoIDHash; service: Service; }) => {
            QueryCacher.clearBrandingCache(videoInfo);
        });
    (await db.prepare("all", `SELECT "videoID", "hashedVideoID", "service" FROM "thumbnails" WHERE "userID" = ?`, [userID]))
        .forEach((videoInfo: { videoID: VideoID; hashedVideoID: VideoIDHash; service: Service; }) => {
            QueryCacher.clearBrandingCache(videoInfo);
        });
}

export async function banIP(hashedIP: HashedIP, unHideOldSubmissions: boolean, type: number,
    categories: Category[], deArrowTypes: DeArrowType[]): Promise<number> {

    //check to see if this user is already shadowbanned
    const row = await db.prepare("get", `SELECT count(*) as "userCount" FROM "shadowBannedIPs" WHERE "hashedIP" = ?`, [hashedIP]);

    if (row.userCount == 0) {
        await db.prepare("run", `INSERT INTO "shadowBannedIPs" VALUES(?)`, [hashedIP]);
    }

    //find all previous submissions and hide them
    if (unHideOldSubmissions) {
        const users = await unHideSubmissionsByIP(categories, hashedIP, type);

        await Promise.all([...users].map((user) => {
            return banUser(user, true, unHideOldSubmissions, type, categories, deArrowTypes);
        }));
    } else if (row.userCount > 0) {
        // Nothing to do, and already added
        return 409;
    }

    return 200;
}

async function unHideSubmissionsByIP(categories: string[], hashedIP: HashedIP, type = 1): Promise<Set<UserID>> {
    const submissions = await privateDB.prepare("all", `SELECT "timeSubmitted" FROM "sponsorTimes" WHERE "hashedIP" = ?`, [hashedIP]) as { timeSubmitted: number }[];

    const users: Set<UserID> = new Set();
    await Promise.all(submissions.map(async (submission) => {
        (await db.prepare("all", `SELECT "videoID", "hashedVideoID", "service", "votes", "views", "userID" FROM "sponsorTimes" WHERE "timeSubmitted" = ? AND "category" in (${categories.map((c) => `'${c}'`).join(",")})`, [submission.timeSubmitted]))
            .forEach((videoInfo: { category: Category, videoID: VideoID, hashedVideoID: VideoIDHash, service: Service, userID: UserID }) => {
                QueryCacher.clearSegmentCache(videoInfo);
                users.add(videoInfo.userID);
            }
            );

        await db.prepare("run", `UPDATE "sponsorTimes" SET "shadowHidden" = ${type} WHERE "timeSubmitted" = ? AND "category" in (${categories.map((c) => `'${c}'`).join(",")})
            AND NOT EXISTS ( SELECT "videoID", "category" FROM "lockCategories" WHERE
            "sponsorTimes"."videoID" = "lockCategories"."videoID" AND "sponsorTimes"."service" = "lockCategories"."service" AND "sponsorTimes"."category" = "lockCategories"."category")`, [submission.timeSubmitted]);
    }));

    return users;
}