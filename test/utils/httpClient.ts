import axios, { AxiosRequestConfig } from "axios";

import { config } from "#config";

const defaultConfig: AxiosRequestConfig = {
    baseURL: `http://localhost:${config.port}`,
    validateStatus: (status) => status < 500,
    paramsSerializer: {
        indexes: null,
    },
};

export const client = axios.create(defaultConfig);
