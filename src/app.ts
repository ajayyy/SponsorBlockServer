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
import dumpDatabase, { redirectLink } from "./routes/dumpDatabase";
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

    router.get("/api/lockReason", getLockReason);

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
