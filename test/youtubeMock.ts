import { APIVideoData, APIVideoInfo } from "../src/types/youtubeApi.model.js";

export class YouTubeApiMock {
    static async listVideos(videoID: string): Promise<APIVideoInfo> {
        const obj = {
            id: videoID
        };

        if (obj.id === "knownWrongID") {
            return {
                err: "No video found"
            };
        }

        if (obj.id === "noDuration") {
            return {
                err: null,
                data: {
                    title: "Example Title",
                    lengthSeconds: 0,
                    videoThumbnails: [
                        {
                            quality: "maxres",
                            url: "https://sponsor.ajay.app/LogoSponsorBlockSimple256px.png",
                            second__originalUrl:"https://sponsor.ajay.app/LogoSponsorBlockSimple256px.png",
                            width: 1280,
                            height: 720
                        },
                    ]
                } as APIVideoData
            };
        } else {
            return {
                err: null,
                data: {
                    title: "Example Title",
                    lengthSeconds: 4980,
                    videoThumbnails: [
                        {
                            quality: "maxres",
                            url: "https://sponsor.ajay.app/LogoSponsorBlockSimple256px.png",
                            second__originalUrl:"https://sponsor.ajay.app/LogoSponsorBlockSimple256px.png",
                            width: 1280,
                            height: 720
                        },
                    ]
                } as APIVideoData
            };
        }
    }
}
