import express, { Request, RequestHandler, Response, Router } from "express";
import { config } from "./config";
import { oldSubmitSponsorTimes } from "./routes/oldSubmitSponsorTimes";
import { oldGetVideoSponsorTimes } from "./routes/oldGetVideoSponsorTimes";
import { postSegmentShift } from "./routes/postSegmentShift";
import { postWarning } from "./routes/postWarning";
import { getIsUserVIP } from "./routes/getIsUserVIP";
import { deleteLockCategoriesEndpoint } from "./routes/deleteLockCategories";
import { postLockCategories } from "./routes/postLockCategories";
import { endpoint as getUserInfo } from "./routes/getUserInfo";
import { getDaysSavedFormatted } from "./routes/getDaysSavedFormatted";
import { getTotalStats } from "./routes/getTotalStats";
import { getTopUsers } from "./routes/getTopUsers";
import { getViewsForUser } from "./routes/getViewsForUser";
import { getSavedTimeForUser } from "./routes/getSavedTimeForUser";
import { addUserAsVIP } from "./routes/addUserAsVIP";
import { shadowBanUser } from "./routes/shadowBanUser";
import { getUsername } from "./routes/getUsername";
import { setUsername } from "./routes/setUsername";
import { viewedVideoSponsorTime } from "./routes/viewedVideoSponsorTime";
import { voteOnSponsorTime, getUserID as voteGetUserID } from "./routes/voteOnSponsorTime";
import { getSkipSegmentsByHash } from "./routes/getSkipSegmentsByHash";
import { postSkipSegments } from "./routes/postSkipSegments";
import { endpoint as getSkipSegments } from "./routes/getSkipSegments";
import { userCounter } from "./middleware/userCounter";
import { loggerMiddleware } from "./middleware/logger";
import { corsMiddleware } from "./middleware/cors";
import { apiCspMiddleware } from "./middleware/apiCsp";
import { rateLimitMiddleware } from "./middleware/requestRateLimit";
import dumpDatabase, { appExportPath, downloadFile } from "./routes/dumpDatabase";
import { endpoint as getSegmentInfo } from "./routes/getSegmentInfo";
import { postClearCache } from "./routes/postClearCache";
import { addUnlistedVideo } from "./routes/addUnlistedVideo";
import { postPurgeAllSegments } from "./routes/postPurgeAllSegments";
import { getUserID } from "./routes/getUserID";
import { getLockCategories } from "./routes/getLockCategories";
import { getLockCategoriesByHash } from "./routes/getLockCategoriesByHash";
import { endpoint as getSearchSegments } from "./routes/getSearchSegments";
import { getStatus } from "./routes/getStatus";
import { getLockReason } from "./routes/getLockReason";
import { getUserStats } from "./routes/getUserStats";
import ExpressPromiseRouter from "express-promise-router";
import { Server } from "http";
import { youtubeApiProxy } from "./routes/youtubeApiProxy";
import { getChapterNames } from "./routes/getChapterNames";
import { getTopCategoryUsers } from "./routes/getTopCategoryUsers";
import { addUserAsTempVIP } from "./routes/addUserAsTempVIP";
import { addFeature } from "./routes/addFeature";
import { generateTokenRequest } from "./routes/generateToken";
import { verifyTokenRequest } from "./routes/verifyToken";

export function createServer(callback: () => void): Server {
    // Create a service (the app object is just a callback).
    const app = express();

    const router = ExpressPromiseRouter();
    app.use(router);

    //setup CORS correctly
    router.use(corsMiddleware);
    router.use(loggerMiddleware);
    router.use("/api/", apiCspMiddleware);
    router.use(express.json());

    if (config.userCounterURL) router.use(userCounter);

    // Setup pretty JSON
    if (config.mode === "development") app.set("json spaces", 2);

    // Set production mode
    app.set("env", config.mode || "production");

    setupRoutes(router);

    return app.listen(config.port, callback);
}

function setupRoutes(router: Router) {
    // Rate limit endpoint lists
    const voteEndpoints: RequestHandler[] = [voteOnSponsorTime];
    const viewEndpoints: RequestHandler[] = [viewedVideoSponsorTime];
    if (config.rateLimit) {
        if (config.rateLimit.vote) voteEndpoints.unshift(rateLimitMiddleware(config.rateLimit.vote, voteGetUserID));
        if (config.rateLimit.view) viewEndpoints.unshift(rateLimitMiddleware(config.rateLimit.view));
    }

    //add the get function
    router.get("/api/getVideoSponsorTimes", void oldGetVideoSponsorTimes);

    //add the oldpost function
    router.get("/api/postVideoSponsorTimes", void oldSubmitSponsorTimes);
    router.post("/api/postVideoSponsorTimes", void oldSubmitSponsorTimes);

    //add the skip segments functions
    router.get("/api/skipSegments", void getSkipSegments);
    router.post("/api/skipSegments", void postSkipSegments);

    // add the privacy protecting skip segments functions
    router.get("/api/skipSegments/:prefix", void getSkipSegmentsByHash);

    //voting endpoint
    router.get("/api/voteOnSponsorTime", ...voteEndpoints);
    router.post("/api/voteOnSponsorTime", ...voteEndpoints);

    //Endpoint when a submission is skipped
    router.get("/api/viewedVideoSponsorTime", ...viewEndpoints);
    router.post("/api/viewedVideoSponsorTime", ...viewEndpoints);

    //To set your username for the stats view
    router.post("/api/setUsername", void setUsername);

    //get what username this user has
    router.get("/api/getUsername", void getUsername);

    //Endpoint used to hide a certain user's data
    router.post("/api/shadowBanUser", void shadowBanUser);

    //Endpoint used to make a user a VIP user with special privileges
    router.post("/api/addUserAsVIP", void addUserAsVIP);
    //Endpoint to add a user as a temporary VIP
    router.post("/api/addUserAsTempVIP", void addUserAsTempVIP);

    //Gets all the views added up for one userID
    //Useful to see how much one user has contributed
    router.get("/api/getViewsForUser", void getViewsForUser);

    //Gets all the saved time added up (views * sponsor length) for one userID
    //Useful to see how much one user has contributed
    //In minutes
    router.get("/api/getSavedTimeForUser", void getSavedTimeForUser);

    router.get("/api/getTopUsers", void getTopUsers);
    router.get("/api/getTopCategoryUsers", void getTopCategoryUsers);

    //send out totals
    //send the total submissions, total views and total minutes saved
    router.get("/api/getTotalStats", void getTotalStats);

    router.get("/api/getUserInfo", void getUserInfo);
    router.get("/api/userInfo", void getUserInfo);

    //send out a formatted time saved total
    router.get("/api/getDaysSavedFormatted", void getDaysSavedFormatted);

    //submit video to lock categories
    router.post("/api/noSegments", void postLockCategories);
    router.post("/api/lockCategories", void postLockCategories);

    router.delete("/api/noSegments", void deleteLockCategoriesEndpoint);
    router.delete("/api/lockCategories", void deleteLockCategoriesEndpoint);

    //get if user is a vip
    router.get("/api/isUserVIP", void getIsUserVIP);

    //sent user a warning
    router.post("/api/warnUser", void postWarning);

    //get if user is a vip
    router.post("/api/segmentShift", void postSegmentShift);

    //get segment info
    router.get("/api/segmentInfo", void getSegmentInfo);

    //clear cache as VIP
    router.post("/api/clearCache", void postClearCache);

    //purge all segments for VIP
    router.post("/api/purgeAllSegments", void postPurgeAllSegments);

    router.post("/api/unlistedVideo", void addUnlistedVideo);

    // get userID from username
    router.get("/api/userID", void getUserID);

    // get lock categores from userID
    router.get("/api/lockCategories", void getLockCategories);

    // get privacy protecting lock categories functions
    router.get("/api/lockCategories/:prefix", void getLockCategoriesByHash);

    // get all segments that match a search
    router.get("/api/searchSegments", void getSearchSegments);

    // autocomplete chapter names
    router.get("/api/chapterNames", void getChapterNames);

    // get status
    router.get("/api/status/:value", void getStatus);
    router.get("/api/status", void getStatus);

    router.get("/api/youtubeApiProxy", void youtubeApiProxy);
    // get user category stats
    router.get("/api/userStats", void getUserStats);

    router.get("/api/lockReason", void getLockReason);

    router.post("/api/feature", void addFeature);

    router.get("/api/generateToken/:type", void generateTokenRequest);
    router.get("/api/verifyToken", void verifyTokenRequest);

    if (config.postgres?.enabled) {
        router.get("/database", (req, res) => void dumpDatabase(req, res, true));
        router.get("/database.json", (req, res) => void dumpDatabase(req, res, false));
        router.get("/database/*", void downloadFile);
        router.use("/download", express.static(appExportPath));
    } else {
        router.get("/database.db", function (req: Request, res: Response) {
            res.sendFile("./databases/sponsorTimes.db", { root: "./" });
        });
    }
}