import {config} from '../src/config';

export function getbaseURL() {
    return "http://localhost:" + config.port;
}

/**
 * Duplicated from Mocha types. TypeScript doesn't infer that type by itself for some reason.
 */
export type Done = (err?: any) => void;