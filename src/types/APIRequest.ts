import { HashedUserID, UserID } from "./user.model";
import { Request } from "express";
import { Category, VideoID } from "./segments.model";

export interface APIRequest extends Request {
    query: {
        userID: UserID | HashedUserID;
        adminUserID: string;
        enabled: string;
        generate: "true" | "false";
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
