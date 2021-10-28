import { HashedUserID, UserID } from "./user.model";
import { Request } from "express";
import { Category, VideoID, VideoIDHash } from "./segments.model";

export interface APIRequest extends Request {
    query: {
        videoID: VideoID;
        userID: UserID | HashedUserID;
        adminUserID: string;
        enabled: string;
        generate: "true" | "false";
        service: "youtube" | "vimeo";
    },
    params: {
        prefix: VideoIDHash;
    },
    body: {
        videoID: null | VideoID,
        year: number,
        views: number,
        channelID: string,
        service: string,
        categories: Category[];
        userID: UserID | HashedUserID;
    }
}
