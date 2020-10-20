/*
YouTubeAPI.videos.list({
  part: "snippet",
  id: videoID
}, function (err, data) {});
 */

// https://developers.google.com/youtube/v3/docs/videos


export class YouTubeApiMock {
    static listVideos(videoID: string, callback: (ytErr: any, data: any) => void) {
        const obj = {
            id: videoID
        };

        if (obj.id === "knownWrongID") {
            callback(undefined, {
                pageInfo: {
                    totalResults: 0,
                },
                items: [],
            });
        }
        if (obj.id === "noDuration") {
            callback(undefined, {
                pageInfo: {
                    totalResults: 1,
                },
                items: [
                    {
                        contentDetails: {
                            duration: "PT0S",
                        },
                        snippet: {
                            title: "Example Title",
                            thumbnails: {
                                maxres: {
                                    url: "https://sponsor.ajay.app/LogoSponsorBlockSimple256px.png",
                                },
                            },
                        },
                    },
                ],
            });
        } else {
            callback(undefined, {
                pageInfo: {
                    totalResults: 1,
                },
                items: [
                    {
                        contentDetails: {
                            duration: "PT1H23M30S",
                        },
                        snippet: {
                            title: "Example Title",
                            thumbnails: {
                                maxres: {
                                    url: "https://sponsor.ajay.app/LogoSponsorBlockSimple256px.png",
                                },
                            },
                        },
                    },
                ],
            });
        }
    }
}
