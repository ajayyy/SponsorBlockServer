import LRU from "@ajayyy/lru-diskcache";
import { config } from "../config";

let DiskCache: LRU<string, string>;

if (config.diskCache) {
    DiskCache = new LRU('./databases/cache', config.diskCache);
    DiskCache.init();
} else {
    DiskCache = {
        // constructor(rootPath, options): {};

        init() {},

        reset() {},

        has(key) { return false; },

        get(key, opts) { return null; },

        // Returns size
        set(key, dataOrSteam) { return new Promise((resolve) => 0); },

        del(key) {},

        size() { return 0; },

        prune() {},
    };
}

export default DiskCache;