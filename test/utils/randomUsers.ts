import { HashedUserID, UserID } from "../../src/types/user.model";
import { getHash } from "../../src/utils/getHash";
import { genRandom } from "./getRandom";

export interface TestUser {
    private: UserID,
    public: HashedUserID,
}

interface InternalTestUsers {
    map: Map<any, TestUser>,
    suiteName: string,
}

const userMapHandler = {
    get(target: InternalTestUsers, property: string): TestUser {
        const suiteName = Reflect.get(target, "suiteName");
        const map = Reflect.get(target, "map");
        let user = map.get(property);
        if (user !== undefined) {
            return user;
        }

        const priv = `${suiteName}-${property}-${genRandom}` as UserID;
        user = {
            private: priv,
            public: getHash(priv),
        };
        map.set(property, user);
        return user;
    },
    set: () => false, // nope
    deleteProperty: () => false, // nope
    has: () => true, // yep
    defineProperty: () => false, // nope
    preventExtensions: () => false, // nope
    setPrototypeOf: () => false, // nope
};

/**
 * Creates an object that generates test private/public userID pairs on demand
 *
 * @param suiteName the suite name, used as a prefix for the private userID
 * @returns a proxy that generates & caches private/public userID pairs for each property access
 */
export function usersForSuite(suiteName: string): Record<any, TestUser> {
    return new Proxy({
        map: new Map<any, TestUser>(),
        suiteName,
    }, userMapHandler) as unknown as Record<any, TestUser>;
}
