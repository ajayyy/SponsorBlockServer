import { Logger } from "./logger";

export class PromiseTimeoutError<T> extends Error {
    promise?: Promise<T>;

    constructor(promise?: Promise<T>) {
        super("Promise timed out");

        this.promise = promise;
    }
}

export interface PromiseWithState<T> extends Promise<T> {
    isResolved: boolean;
    isRejected: boolean;
}

export function promiseOrTimeout<T>(promise: Promise<T>, timeout?: number): Promise<T> {
    return Promise.race([timeoutPomise<T>(timeout), promise]);
}

export function timeoutPomise<T>(timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
        if (timeout) {
            setTimeout(() => {
                reject(new PromiseTimeoutError());
            }, timeout);
        }
    });
}

export function savePromiseState<T>(promise: Promise<T>): PromiseWithState<T> {
    const p = promise as PromiseWithState<T>;
    p.isResolved = false;
    p.isRejected = false;

    p.then(() => {
        p.isResolved = true;
    }).catch(() => {
        p.isRejected = true;
    });

    return p;
}

/**
 * Allows rejection or resolve
 * Allows past resolves too, but not past rejections
 */
export function nextFulfilment<T>(promises: PromiseWithState<T>[]): Promise<T> {
    return Promise.race(promises.filter((p) => !p.isRejected));
}

export function oneOf<T>(promises: Promise<T>[]): Promise<T> {
    return new Promise((resolve, reject) => {
        let fulfilments = 0;
        for (const promise of promises) {
            promise.then((result) => {
                fulfilments++;

                if (result || fulfilments === promises.length) {
                    resolve(result);
                }
            }).catch((err) => {
                fulfilments++;

                if (fulfilments === promises.length) {
                    reject(err);
                } else {
                    Logger.error(`oneOf ignore error (promise): ${err}`);
                }
            });
        }
    });
}