export function createMemoryCache(memoryFn: (...args: any[]) => void, cacheTimeMs: number): any {
    /* istanbul ignore if */
    if (isNaN(cacheTimeMs)) cacheTimeMs = 0;

    // holds the promise results
    const cache = new Map();
    // holds the promises that are not fulfilled
    const promiseMemory = new Map();
    return (...args: any[]) => {
        // create cacheKey by joining arguments as string
        const cacheKey = args.join(".");
        // check if promising is already running
        if (promiseMemory.has(cacheKey)) {
            return promiseMemory.get(cacheKey);
        } else {
            // check if result is in cache
            if (cache.has(cacheKey)) {
                const cacheItem = cache.get(cacheKey);
                const now = Date.now();
                // check if cache is valid
                if (!(cacheItem.cacheTime + cacheTimeMs < now)) {
                    return Promise.resolve(cacheItem.result);
                }
            }
            // create new promise
            const promise = Promise.resolve(memoryFn(...args));
            // store promise reference until fulfilled
            promiseMemory.set(cacheKey, promise);
            return promise.then(result => {
                // store promise result in cache
                cache.set(cacheKey, {
                    result,
                    cacheTime: Date.now(),
                });
                // remove fulfilled promise from memory
                promiseMemory.delete(cacheKey);
                // return promise result
                return result;
            });
        }
    };
}
