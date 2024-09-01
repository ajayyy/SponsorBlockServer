import { config } from "../../src/config";
import assert from "assert";
import { YouTubeAPI } from "../../src/utils/youtubeApi";
import * as innerTube from "../../src/utils/innerTubeAPI";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { getVideoDetails } from "../../src/utils/getVideoDetails";

const videoID = "BaW_jenozKc";
const expectedInnerTube = { // partial type of innerTubeVideoDetails
    videoId: videoID,
    title: "youtube-dl test video \"'/\\ä↭𝕐",
    lengthSeconds: "10",
    channelId: "UCLqxVugv74EIW3VWh2NOa3Q",
    isOwnerViewing: false,
    isCrawlable: true,
    allowRatings: true,
    author: "Philipp Hagemeister",
    isPrivate: false,
    isUnpluggedCorpus: false,
    isLiveContent: false
};
const currentViews = 49816;

xdescribe("innertube API test", function() {
    it("should be able to get innerTube details", async () => {
        const result = await innerTube.getPlayerData(videoID, true);
        assert.ok(partialDeepEquals(result, expectedInnerTube));
    });
    it("Should have more views than current", async () => {
        const result = await innerTube.getPlayerData(videoID, true);
        assert.ok(Number(result.viewCount) >= currentViews);
    });
    it("Should have equivalent response from NewLeaf", async function () {
        if (!config.newLeafURLs || config.newLeafURLs.length <= 0 || config.newLeafURLs[0] == "placeholder") this.skip();
        const itResponse = await innerTube.getPlayerData(videoID, true);
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
    it("Should not fail when getting data for private video", async function () {
        const privateVideoId = "ZuibAax0VD8";
        const videoDetail = await getVideoDetails(privateVideoId);
        assert.ok(videoDetail);
    });
});