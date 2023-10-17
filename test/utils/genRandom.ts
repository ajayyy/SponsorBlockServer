import crypto from "crypto";

export const genRandom = (bytes=8): string => crypto.pseudoRandomBytes(bytes).toString("hex");

export const genRandomValue = (prefix: string, identifier: string, bytes=8): string => `${prefix}-${identifier}-${genRandom(bytes)}`;
export const multiGenRandomValue = (prefix: string, identifier: string, count: number, bytes=8): string[] => {
    const arr: string[] = [];
    for (let i = 0; i < count; i++) arr.push(genRandomValue(prefix, identifier, bytes));
    return arr;
};