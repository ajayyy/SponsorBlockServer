import { config } from "../src/config.js";
import { Logger } from "../src/utils/logger.js";

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
export const partialDeepEquals = (actual: Record<string, any>, expected: Record<string, any>, print = true): boolean => {
    // loop over key, value of expected
    for (const [ key, value ] of Object.entries(expected)) {
        // if value is object or array, recurse
        if (Array.isArray(value) || typeof value === "object") {
            if (!partialDeepEquals(actual?.[key], value, false)) {
                if (print) printActualExpected(actual, expected);

                return false;
            }
        }
        else if (actual?.[key] !== value) {
            if (print) printActualExpected(actual, expected);

            return false;
        }
    }
    return true;
};

function printActualExpected(actual: Record<string, any>, expected: Record<string, any>): void {
    Logger.error(`Actual: ${JSON.stringify(actual)}`);
    Logger.error(`Expected: ${JSON.stringify(expected)}`);
}