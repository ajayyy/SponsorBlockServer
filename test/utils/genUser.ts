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

export const emptyUser: User = { privID: "" as UserID, pubID: "" as HashedUserID, info: {} };
export const emptyUsernameUser: UsernameUser = { ...emptyUser, username: "" };

export const genUser = (fnname: string, testcase: string, info: info = {}): User => {
    const privID = `${fnname}-${testcase}-${genRandom(2)}` as UserID;
    const pubID = getHash(privID);
    return { privID, pubID, info };
};

export const genUserUsername = (fnname: string, testcase: string, username: string, info: info = {}): UsernameUser => {
    const user = genUser(fnname, testcase, info) as UsernameUser;
    user.username = username;
    return user;
};

export const genAnonUser = (info: info = {}): User => {
    const privID = `user-${genRandom()}` as UserID;
    const pubID = getHash(privID);
    return { privID, pubID, info };
};

const genUsers = (fnname: string, testcase: string[]): userArray => {
    const users: userArray = {};
    for (const tc of testcase)
        users[tc] = genUser(fnname, tc);
    return users;
};

export const genUsersProxy = (fnname: string) =>
    new Proxy({}, {
        get(target: Record<string, User>, prop, receiver) {
            if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);
            const identifier = typeof prop === "string" ? prop : "";
            const result = genUser(fnname, identifier);
            Reflect.set(target, prop, result, receiver);
            return result;
        },
    });

export const genUsersUsername = (fnname: string, case_usernames: Map<string, string>): usernameUserArray => {
    const cases = Array.from(case_usernames.keys());
    const users = genUsers(fnname, cases);
    case_usernames.forEach((username, tc) => (users[tc] as UsernameUser).username = username);
    return users as usernameUserArray;
};