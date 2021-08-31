export interface APIVideoData {
    "title": string,
    "videoId": string,
    "videoThumbnails": [
        {
        "quality": string,
        "url": string,
        second__originalUrl: string,
        "width": number,
        "height": number
        }
    ],

    "description": string,
    "descriptionHtml": string,
    "published": number,
    "publishedText": string,

    "keywords": string[],
    "viewCount": number,
    "likeCount": number,
    "dislikeCount": number,

    "paid": boolean,
    "premium": boolean,
    "isFamilyFriendly": boolean,
    "allowedRegions": string[],
    "genre": string,
    "genreUrl": string,

    "author": string,
    "authorId": string,
    "authorUrl": string,
    "authorThumbnails": [
        {
        "url": string,
        "width": number,
        "height": number
        }
    ],

    "subCountText": string,
    "lengthSeconds": number,
    "allowRatings": boolean,
    "rating": number,
    "isListed": boolean,
    "liveNow": boolean,
    "isUpcoming": boolean,
    "premiereTimestamp"?: number,

    "hlsUrl"?: string,
    "adaptiveFormats": [
        {
        "index": string,
        "bitrate": string,
        "init": string,
        "url": string,
        "itag": string,
        "type": string,
        "clen": string,
        "lmt": string,
        "projectionType": number,
        "container": string,
        "encoding": string,
        "qualityLabel"?: string,
        "resolution"?: string
        }
    ],
    "formatStreams": [
        {
        "url": string,
        "itag": string,
        "type": string,
        "quality": string,
        "container": string,
        "encoding": string,
        "qualityLabel": string,
        "resolution": string,
        "size": string
        }
    ],
    "captions": [
        {
        "label": string,
        "languageCode": string,
        "url": string
        }
    ],
    "recommendedVideos": [
        {
        "videoId": string,
        "title": string,
        "videoThumbnails": [
            {
            "quality": string,
            "url": string,
            "width": number,
            "height": number
            }
        ],
        "author": string,
        "lengthSeconds": number,
        "viewCountText": string
        }
    ]
}

export interface APIVideoInfo {
    err: boolean | string,
    data?: APIVideoData
}