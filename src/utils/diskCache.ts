import LRU from "@ajayyy/lru-diskcache";
import { config } from "../config";

let DiskCache: LRU<string, string>;

if (config.diskCache) {
    DiskCache = new LRU('./databases/cache', config.diskCache);
    DiskCache.init();
} else {
    DiskCache = {
        // constructor(rootPath, options): {};

        init(): void { return; },

        reset(): void { return; },

        has(key: string): boolean { return false; },

        get(key: string, opts): string { return null; },

        // Returns size
        set(key: string, dataOrSteam): Promise<number> { return new Promise(() => 0); },

        del(key: string): void { return; },

        size(): number { return 0; },

        prune(): void {return; },
    };
}

export default DiskCache;