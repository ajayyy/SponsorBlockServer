import { config } from "../../src/config";
import axios, { AxiosRequestConfig } from "axios";

const defaultConfig: AxiosRequestConfig = {
    baseURL: `http://localhost:${config.port}`,
    validateStatus: (status) => status < 500
};

export const client = axios.create(defaultConfig);
