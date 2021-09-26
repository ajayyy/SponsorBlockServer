import { config } from "../config";

const minimumPrefix = config.minimumPrefix || "3";
const maximumPrefix = config.maximumPrefix || "32"; // Half the hash.

const prefixChecker = new RegExp(`^[\\da-f]{${minimumPrefix},${maximumPrefix}}$`, "i");

export function hashPrefixTester(prefix: string): boolean {
    return prefixChecker.test(prefix);
}
