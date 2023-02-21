import crypto from "crypto";

export const genRandom = (bytes=8) => crypto.pseudoRandomBytes(bytes).toString("hex");
