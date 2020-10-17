/*
YouTubeAPI.videos.list({
  part: "snippet",
  id: videoID
}, function (err, data) {});
 */

// https://developers.google.com/youtube/v3/docs/videos

export const YouTubeAPI = {
    listVideos: (id: string, callback: (ytErr: any, data: any) => void) => {
        YouTubeAPI.videos.list({
            id: id,
        }, callback);
    },
    videos: {
        list: (obj: { part: string; id: any } | { id: string }, callback: (ytErr: any, data: any) => void) => {
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
        },
    },
};
