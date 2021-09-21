import { config } from "../../src/config";

export function getbaseURL(): string {
    return `http://localhost:${config.port}`;
}