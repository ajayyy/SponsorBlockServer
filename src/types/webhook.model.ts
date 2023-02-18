import * as segments from "./segments.model";
import { HashedUserID } from "./user.model";

export enum voteType {
    up = "vote.up",
    down = "vote.down",
}

export enum authorType {
    Self = "self",
    TempVIP = "temp vip",
    VIP = "vip",
    New = "new",
    Other = "other",
}

export interface WebhookData {
    user: {
        status: authorType
    }
    video: {
        id: segments.VideoID
        title: string | undefined,
        url: URL | string,
        thumbnail: URL | string,
    },
    submission: {
        UUID: segments.SegmentUUID,
        views?: number,
        locked?: boolean,
        category: segments.Category,
        startTime: number,
        endTime: number,
        user: {
            UUID: HashedUserID,
            username: string | HashedUserID,
            submissions?: {
                total: number,
                ignored: number,
            },
        },
    },
    votes?: {
        before: number,
        after: number
    }
    authorName?: string
}