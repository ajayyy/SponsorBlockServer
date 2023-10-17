import crypto from "crypto";

export const genRandom = (chars=4): string => crypto.pseudoRandomBytes(chars/2).toString("hex");
export const genRandomValue = (prefix: string, identifier: string, chars=4): string => `${prefix}-${identifier}-${genRandom(chars)}`;
export const multiGenRandomValue = (prefix: string, identifier: string, count: number, bytes=8): string[] => {
    const arr: string[] = [];
    for (let i = 0; i < count; i++) arr.push(genRandomValue(prefix, identifier, bytes));
    return arr;
};