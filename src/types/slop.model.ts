import { HashedValue } from "./hash.model";
import { Service } from "./segments.model";
import { UserID } from "./user.model";

export type ContentID = string & { __contentIDBrand: unknown };
export type ProfileID = string & { __profileIDBrand: unknown };
export type ContentIDHash = ContentID & HashedValue;
export type ProfileIDHash = ProfileID & HashedValue;

export interface SlopSubmission {
    service: Service;
    contentID: ContentID;
    profileID: ProfileID;
    comment?: string;
    rating?: number;
    wholeProfile: boolean;
    votes: string[];
    userID: UserID;
}