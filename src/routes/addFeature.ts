import { getHashCache } from "../utils/getHashCache";
import { db } from "../databases/databases";
import { config } from "../config";
import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { Feature, HashedUserID, UserID } from "../types/user.model";
import { Logger } from "../utils/logger";
import { QueryCacher } from "../utils/queryCacher";
import { getVerificationValue, verifyOldSubmissions } from "./postBranding";

interface AddFeatureRequest extends Request {
    body: {
        userID: HashedUserID;
        adminUserID: string;
        feature: string;
        enabled: string;
    }
}

const allowedFeatures = {
    vip: [
        Feature.ChapterSubmitter,
        Feature.FillerSubmitter,
        Feature.DeArrowTitleSubmitter,
    ],
    admin: [
        Feature.ChapterSubmitter,
        Feature.FillerSubmitter,
        Feature.DeArrowTitleSubmitter,
    ]
};

export async function addFeature(req: AddFeatureRequest, res: Response): Promise<Response> {
    const { body: { userID, adminUserID } } = req;
    const feature = parseInt(req.body.feature) as Feature;
    const enabled = req.body?.enabled !== "false";

    if (!userID || !adminUserID) {
        // invalid request
        return res.sendStatus(400);
    }

    // hash the userID
    const adminUserIDInput = await getHashCache(adminUserID as UserID);
    const isAdmin = adminUserIDInput === config.adminUserID;
    const isVIP = (await isUserVIP(adminUserIDInput)) || isAdmin;

    if (!isVIP) {
        // not authorized
        return res.sendStatus(403);
    }

    try {
        const currentAllowedFeatures = isAdmin ? allowedFeatures.admin : allowedFeatures.vip;
        if (currentAllowedFeatures.includes(feature)) {
            if (enabled) {
                const featureAdded = await db.prepare("get", 'SELECT "feature" from "userFeatures" WHERE "userID" = ? AND "feature" = ?', [userID, feature]);
                if (!featureAdded) {
                    await db.prepare("run", 'INSERT INTO "userFeatures" ("userID", "feature", "issuerUserID", "timeSubmitted") VALUES(?, ?, ?, ?)'
                        , [userID, feature, adminUserID, Date.now()]);
                }

                if (feature === Feature.DeArrowTitleSubmitter) {
                    await verifyOldSubmissions(userID, await getVerificationValue(userID, false));
                }
            } else {
                await db.prepare("run", 'DELETE FROM "userFeatures" WHERE "userID" = ? AND "feature" = ?', [userID, feature]);
            }

            QueryCacher.clearFeatureCache(userID, feature);
        } else {
            return res.status(400).send("Invalid feature");
        }

        return res.sendStatus(200);
    } catch (e) {
        Logger.error(e as string);

        return res.sendStatus(500);
    }
}
