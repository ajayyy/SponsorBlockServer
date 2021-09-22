import { config } from "../../src/config";
import axios, { AxiosRequestConfig } from "axios";

export function getbaseURL(): string {
    return `http://localhost:${config.port}`;
}

export const defaultConfig: AxiosRequestConfig = {
    baseURL: getbaseURL(),
    validateStatus: (status) => status < 500
};

export const client = axios.create(defaultConfig);
