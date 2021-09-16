import { Service } from "../types/segments.model";

export function getService<T extends string>(...value: T[]): Service {
    for (const name of value) {
        if (name) {
            const service = Object.values(Service).find(
                (val) => val.toLowerCase() === name.trim().toLowerCase()
            );
            if (service) {
                return service;
            }
        }
    }

    return Service.YouTube;
}
