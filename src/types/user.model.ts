import { HashedValue } from "./hash.model.js";

export type UserID = string & { __userIDBrand: unknown };
export type HashedUserID = UserID & HashedValue;