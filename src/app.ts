import express, { Request, RequestHandler, Response, Router } from "express";
import { config } from "./config.js";
import { oldSubmitSponsorTimes } from "./routes/oldSubmitSponsorTimes.js";
import { oldGetVideoSponsorTimes } from "./routes/oldGetVideoSponsorTimes.js";
import { postSegmentShift } from "./routes/postSegmentShift.js";
import { postWarning } from "./routes/postWarning.js";
import { getIsUserVIP } from "./routes/getIsUserVIP.js";
import { deleteLockCategoriesEndpoint } from "./routes/deleteLockCategories.js";
import { postLockCategories } from "./routes/postLockCategories.js";
import { endpoint as getUserInfo } from "./routes/getUserInfo.js";
import { getDaysSavedFormatted } from "./routes/getDaysSavedFormatted.js";
import { getTotalStats } from "./routes/getTotalStats.js";
import { getTopUsers } from "./routes/getTopUsers.js";
import { getViewsForUser } from "./routes/getViewsForUser.js";
import { getSavedTimeForUser } from "./routes/getSavedTimeForUser.js";
import { addUserAsVIP } from "./routes/addUserAsVIP.js";
import { shadowBanUser } from "./routes/shadowBanUser.js";
import { getUsername } from "./routes/getUsername.js";
import { setUsername } from "./routes/setUsername.js";
import { viewedVideoSponsorTime } from "./routes/viewedVideoSponsorTime.js";
import { voteOnSponsorTime, getUserID as voteGetUserID } from "./routes/voteOnSponsorTime.js";
import { getSkipSegmentsByHash } from "./routes/getSkipSegmentsByHash.js";
import { postSkipSegments } from "./routes/postSkipSegments.js";
import { endpoint as getSkipSegments } from "./routes/getSkipSegments.js";
import { userCounter } from "./middleware/userCounter.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { corsMiddleware } from "./middleware/cors.js";
import { apiCspMiddleware } from "./middleware/apiCsp.js";
import { rateLimitMiddleware } from "./middleware/requestRateLimit.js";
import dumpDatabase, { redirectLink } from "./routes/dumpDatabase.js";
import { endpoint as getSegmentInfo } from "./routes/getSegmentInfo.js";
import { postClearCache } from "./routes/postClearCache.js";
import { addUnlistedVideo } from "./routes/addUnlistedVideo.js";
import { postPurgeAllSegments } from "./routes/postPurgeAllSegments.js";
import { getUserID } from "./routes/getUserID.js";
import { getLockCategories } from "./routes/getLockCategories.js";
import { getLockCategoriesByHash } from "./routes/getLockCategoriesByHash.js";
import { endpoint as getSearchSegments } from "./routes/getSearchSegments.js";
import { getStatus } from "./routes/getStatus.js";
import { getUserStats } from "./routes/getUserStats.js";
import ExpressPromiseRouter from "express-promise-router";
import { Server } from "http";
import { youtubeApiProxy } from "./routes/youtubeApiProxy.js";

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

    if (config.userCounterURL) app.use(userCounter);

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
    router.get("/api/getVideoSponsorTimes", oldGetVideoSponsorTimes);

    //add the oldpost function
    router.get("/api/postVideoSponsorTimes", oldSubmitSponsorTimes);
    router.post("/api/postVideoSponsorTimes", oldSubmitSponsorTimes);

    //add the skip segments functions
    router.get("/api/skipSegments", getSkipSegments);
    router.post("/api/skipSegments", postSkipSegments);

    // add the privacy protecting skip segments functions
    router.get("/api/skipSegments/:prefix", getSkipSegmentsByHash);

    //voting endpoint
    router.get("/api/voteOnSponsorTime", ...voteEndpoints);
    router.post("/api/voteOnSponsorTime", ...voteEndpoints);

    //Endpoint when a submission is skipped
    router.get("/api/viewedVideoSponsorTime", ...viewEndpoints);
    router.post("/api/viewedVideoSponsorTime", ...viewEndpoints);

    //To set your username for the stats view
    router.post("/api/setUsername", setUsername);

    //get what username this user has
    router.get("/api/getUsername", getUsername);

    //Endpoint used to hide a certain user's data
    router.post("/api/shadowBanUser", shadowBanUser);

    //Endpoint used to make a user a VIP user with special privileges
    router.post("/api/addUserAsVIP", addUserAsVIP);

    //Gets all the views added up for one userID
    //Useful to see how much one user has contributed
    router.get("/api/getViewsForUser", getViewsForUser);

    //Gets all the saved time added up (views * sponsor length) for one userID
    //Useful to see how much one user has contributed
    //In minutes
    router.get("/api/getSavedTimeForUser", getSavedTimeForUser);

    router.get("/api/getTopUsers", getTopUsers);

    //send out totals
    //send the total submissions, total views and total minutes saved
    router.get("/api/getTotalStats", getTotalStats);

    router.get("/api/getUserInfo", getUserInfo);
    router.get("/api/userInfo", getUserInfo);

    //send out a formatted time saved total
    router.get("/api/getDaysSavedFormatted", getDaysSavedFormatted);

    //submit video to lock categories
    router.post("/api/noSegments", postLockCategories);
    router.post("/api/lockCategories", postLockCategories);

    router.delete("/api/noSegments", deleteLockCategoriesEndpoint);
    router.delete("/api/lockCategories", deleteLockCategoriesEndpoint);

    //get if user is a vip
    router.get("/api/isUserVIP", getIsUserVIP);

    //sent user a warning
    router.post("/api/warnUser", postWarning);

    //get if user is a vip
    router.post("/api/segmentShift", postSegmentShift);

    //get segment info
    router.get("/api/segmentInfo", getSegmentInfo);

    //clear cache as VIP
    router.post("/api/clearCache", postClearCache);

    //purge all segments for VIP
    router.post("/api/purgeAllSegments", postPurgeAllSegments);

    router.post("/api/unlistedVideo", addUnlistedVideo);

    // get userID from username
    router.get("/api/userID", getUserID);

    // get lock categores from userID
    router.get("/api/lockCategories", getLockCategories);

    // get privacy protecting lock categories functions
    router.get("/api/lockCategories/:prefix", getLockCategoriesByHash);

    // get all segments that match a search
    router.get("/api/searchSegments", getSearchSegments);

    // get status
    router.get("/api/status/:value", getStatus);
    router.get("/api/status", getStatus);

    router.get("/api/youtubeApiProxy", youtubeApiProxy);
    // get user category stats
    router.get("/api/userStats", getUserStats);

    if (config.postgres) {
        router.get("/database", (req, res) => dumpDatabase(req, res, true));
        router.get("/database.json", (req, res) => dumpDatabase(req, res, false));
        router.get("/database/*", redirectLink);
    } else {
        router.get("/database.db", function (req: Request, res: Response) {
            res.sendFile("./databases/sponsorTimes.db", { root: "./" });
        });
    }
}
