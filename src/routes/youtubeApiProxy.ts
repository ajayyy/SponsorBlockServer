import { Request, Response } from "express";
import { YouTubeAPI } from "../utils/youtubeApi";


export async function youtubeApiProxy(req: Request, res: Response): Promise<Response> {
    if (req.query.key !== "8NpFUCMr2Gq4cy4UrUJPBfGBbRQudhJ8zzex8Gq44RYDywLt3UtbbfDap3KPDbcS") {
        return res.send("Invalid key").status(403);
    }

    const videoID = req.query.videoID;
    if (videoID === undefined || typeof(videoID) !== "string" || videoID.length !== 11) {
        return res.status(400).send("Invalid parameters");
    }

    const result = await YouTubeAPI.listVideos(videoID);
    if (result.err) {
        return res.send("API failure").status(500);
    } else {
        return res.send(result.data).status(200);
    }
}