import { Service } from "../types/segments.model";

export function getService<T extends string>(...value: T[]): Service {
    const serviceByName = Object.values(Service).reduce((acc, serviceName) => {
        acc[serviceName.toLowerCase()] = serviceName;

        return acc;
    }, {} as Record<string, Service>);

    for (const name of value) {
        if (name?.trim().toLowerCase() in serviceByName) {
            return serviceByName[name.trim().toLowerCase()];
        }
    }

    return Service.YouTube;
}

export function getUnsupportedService<T extends string>(...value: T[]): string | undefined {
    const serviceByName = Object.values(Service).reduce((acc, serviceName) => {
        acc[serviceName.toLowerCase()] = serviceName;

        return acc;
    }, {} as Record<string, Service>);

    let unsupportedValue;
    for (const name of value) {
        const cleanName = name?.trim().toLowerCase()
        if (cleanName in serviceByName) {
            return null
        }
        if(cleanName) unsupportedValue = name
    }

    return unsupportedValue
}
