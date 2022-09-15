import axios from "axios";
import { innerTubeVideoDetails } from "../types/innerTubeApi.model";

export async function getPlayerData(videoID: string): Promise<innerTubeVideoDetails> {
    // start subrequest
    const url = "https://www.youtube.com/youtubei/v1/player";
    const data = {
        context: {
            client: {
                clientName: "WEB",
                clientVersion: "2.20211129.09.00"
            }
        },
        videoId: videoID
    };
    const result = await axios.post(url, data, {
        timeout: 3500
    });
    if (result.status === 200) {
        return result.data.videoDetails;
    } else {
        return Promise.reject(result.status);
    }
}