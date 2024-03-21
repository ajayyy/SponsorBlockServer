import crypto from "crypto";

export const genRandom = (chars=8): string => crypto.pseudoRandomBytes(chars/2).toString("hex");
export const genRandomNumber = (min = 0, max = 100) => Math.floor(Math.random() * (max - min) + min);
export const genRandomValue = (prefix: string, identifier: string, chars=8): string => `${prefix}-${identifier}-${genRandom(chars)}`;
export const selectRandom = (arr: any[]) => arr[genRandomNumber(0, arr.length)];
export const multiGenProxy = (prefix: string, identifier: string) =>
    new Proxy({}, {
        get(target: Record<string, string>, prop: string, receiver) {
            if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);
            const longIdentifier = typeof prop === "string" ? identifier + prop : identifier;
            const result = genRandomValue(prefix, longIdentifier);
            Reflect.set(target, prop, result, receiver);
            return result;
        }
    });