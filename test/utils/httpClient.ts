import axios, { AxiosRequestConfig } from "axios";

import { config } from "#config";

const defaultConfig: AxiosRequestConfig = {
    baseURL: `http://localhost:${config.port}`,
    validateStatus: (status) => status < 500
};

export const client = axios.create(defaultConfig);
