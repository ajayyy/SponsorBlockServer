import {config} from "../src/config";

export function getbaseURL(): string {
    return `http://localhost:${config.port}`;
}

/**
 * Duplicated from Mocha types. TypeScript doesn't infer that type by itself for some reason.
 */
export type Done = (err?: any) => void;

/**
 *
 * Check object contains expected properties
 */
export const objectContain = (actual: Record<string, any>, expect: Record<string, any>): boolean => {
    if (typeof actual !== "object" || typeof expect !== "object") {
        throw new Error("actual and expect must be type of object");
    }

    const expectKeys = Object.keys(expect);

    for(let i = 0; i < expectKeys.length; i += 1) {
        const key = expectKeys[i];
        if (!Object.prototype.hasOwnProperty.call(actual, key)) {
            return false;
        } else {
            if (typeof actual[key] === "object") {
                if (!objectContain(actual[key], expect[key])) {
                    return false;
                }
            } else {
                if (actual[key] !== expect[key]) {
                    return false;
                }
            }
        }
    }

    return true;
};