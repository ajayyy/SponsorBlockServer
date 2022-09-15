import { config } from "../../src/config";
import assert from "assert";
// import { innerTubeVideoDetails } from "../../src/types/innerTubeApi.model";
import { YouTubeAPI } from "../../src/utils/youtubeApi";
import * as innerTube from "../../src/utils/innerTubeAPI";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { getVideoDetails } from "../../src/utils/getVideoDetails";

const videoID = "dQw4w9WgXcQ";
const expectedInnerTube = { // partial type of innerTubeVideoDetails
    videoId: videoID,
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    lengthSeconds: "212",
    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    isOwnerViewing: false,
    isCrawlable: true,
    allowRatings: true,
    author: "Rick Astley",
    isPrivate: false,
    isUnpluggedCorpus: false,
    isLiveContent: false
};
const currentViews = 1284257550;

describe("innertube API test", function() {
    it("should be able to get innerTube details", async () => {
        const result = await innerTube.getPlayerData(videoID);
        assert.ok(partialDeepEquals(result, expectedInnerTube));
    });
    it("Should have more views than current", async () => {
        const result = await innerTube.getPlayerData(videoID);
        assert.ok(Number(result.viewCount) >= currentViews);
    });
    it("Should have equivalent response from NewLeaf", async function () {
        if (!config.newLeafURLs || config.newLeafURLs.length <= 0 || config.newLeafURLs[0] == "placeholder") this.skip();
        const itResponse = await innerTube.getPlayerData(videoID);
        const newLeafResponse = await YouTubeAPI.listVideos(videoID, true);
        // validate videoID
        assert.strictEqual(itResponse.videoId, videoID);
        assert.strictEqual(newLeafResponse.data?.videoId, videoID);
        // validate description
        assert.strictEqual(itResponse.shortDescription, newLeafResponse.data?.description);
        // validate authorId
        assert.strictEqual(itResponse.channelId, newLeafResponse.data?.authorId);
    });
    it("Should return data from generic endpoint", async function () {
        const videoDetail = await getVideoDetails(videoID);
        assert.ok(videoDetail);
    });
});