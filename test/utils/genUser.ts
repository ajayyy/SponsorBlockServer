import { genRandom } from "./genRandom";
import { UserID, HashedUserID } from "../../src/types/user.model";
import { getHash } from "../../src/utils/getHash";

type info = Record<string, any>

export interface User {
    privID: UserID,
    pubID: HashedUserID
    info: info
}
export type userArray = Record<string, User>

export interface UsernameUser extends User {
    username: string
}
export type usernameUserArray = Record<string, UsernameUser>

export const genUser = (fnname: string, testcase: string, info: info = {}): User => {
    const privID = `${fnname}-${testcase}-${genRandom(2)}` as UserID;
    const pubID = getHash(privID);
    return { privID, pubID, info };
};

export const genAnonUser = (info: info = {}): User => {
    const privID = `user-${genRandom()}` as UserID;
    const pubID = getHash(privID);
    return { privID, pubID, info };
};

export const genUsers = (fnname: string, testcase: string[]): userArray => {
    const users: userArray = {};
    for (const tc of testcase)
        users[tc] = genUser(fnname, tc);
    return users;
};

export const genUsersUsername = (fnname: string, case_usernames: Map<string, string>): usernameUserArray => {
    const cases = Array.from(case_usernames.keys());
    const users = genUsers(fnname, cases);
    case_usernames.forEach((username, tc) => (users[tc] as UsernameUser).username = username);
    return users as usernameUserArray;
};