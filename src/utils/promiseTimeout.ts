export function promiseTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
        if (timeout) {
            setTimeout(() => {
                reject(new Error("Promise timed out"));
            }, timeout);
        }

        promise.then(resolve, reject);
    });
}