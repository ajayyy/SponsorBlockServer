import { config } from "../config";
import { innerTubeVideoDetails } from "../types/innerTubeApi.model";
import { APIVideoData } from "../types/youtubeApi.model";
import { YouTubeAPI } from "../utils/youtubeApi";
import { getPlayerData } from "../utils/innerTubeAPI";

export interface videoDetails {
  videoId: string,
  duration: number,
  authorId: string,
  authorName: string,
  title: string,
  published: number,
  thumbnails: {
    url: string,
    width: number,
    height: number,
  }[]
}

const convertFromInnerTube = (input: innerTubeVideoDetails): videoDetails => ({
    videoId: input.videoId,
    duration: Number(input.lengthSeconds),
    authorId: input.channelId,
    authorName: input.author,
    title: input.title,
    published: new Date(input.publishDate).getTime()/1000,
    thumbnails: input.thumbnail.thumbnails
});

const convertFromNewLeaf = (input: APIVideoData): videoDetails => ({
    videoId: input.videoId,
    duration: input.lengthSeconds,
    authorId: input.authorId,
    authorName: input.author,
    title: input.title,
    published: input.published,
    thumbnails: input.videoThumbnails
});

async function newLeafWrapper(videoId: string, ignoreCache: boolean) {
    const result = await YouTubeAPI.listVideos(videoId, ignoreCache);
    return result?.data ?? Promise.reject();
}

export function getVideoDetails(videoId: string, ignoreCache = false): Promise<videoDetails> {
    if (!config.newLeafURLs) {
        return getPlayerData(videoId, ignoreCache)
            .then(data => convertFromInnerTube(data));
    }
    return Promise.any([
        newLeafWrapper(videoId, ignoreCache)
            .then(videoData => convertFromNewLeaf(videoData)),
        getPlayerData(videoId, ignoreCache)
            .then(data => convertFromInnerTube(data))
    ]).catch(() => {
        return null;
    });
}