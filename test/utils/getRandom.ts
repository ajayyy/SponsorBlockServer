import crypto from "crypto";

export const genRandom = (bytes=8) => crypto.pseudoRandomBytes(bytes).toString("hex");

export const genRandomValue = (prefix: string, identifier: string, bytes=8) => `${prefix}-${identifier}-${genRandom(bytes)}`;