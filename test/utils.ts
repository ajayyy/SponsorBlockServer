import {config} from '../src/config';

export function getbaseURL() {
    return "http://localhost:" + config.port;
}
