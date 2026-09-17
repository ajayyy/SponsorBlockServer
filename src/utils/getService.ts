import { Service } from "#types/segments";

const serviceByName = Object.values(Service).reduce((acc, serviceName) => {
    acc[serviceName.toLowerCase()] = serviceName;
    return acc;
}, {} as Record<string, Service>);

export function getService<T extends string>(...value: T[]): Service {
    for (const name of value) {
        if (name?.trim().toLowerCase() in serviceByName) {
            return serviceByName[name.trim().toLowerCase()];
        }
    }

    return Service.YouTube;
}
