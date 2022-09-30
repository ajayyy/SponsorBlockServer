export interface innerTubeVideoDetails {
    "videoId": string,
    "title": string,
    "lengthSeconds": string, // yes, don't ask.
    "channelId": string,
    "isOwnerViewing": boolean,
    "shortDescription": string,
    "isCrawlable": boolean,
    "thumbnail": {
        "thumbnails": [{
                "url": string,
                "width": number,
                "height": number
            }
        ]
    },
    "allowRatings": boolean,
    "viewCount": string, // yes, don't ask
    "author": string,
    "isPrivate": boolean,
    "isUnpluggedCorpus": boolean,
    "isLiveContent": boolean,
    "publishDate": string
}