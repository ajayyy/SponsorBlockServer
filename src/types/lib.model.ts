/**
 * Better ecord that will work with branded types
 * Keys still don't work properly though and are always string
 */
export type SBRecord<K extends string, T> = {
    [P in string | K]: T;
};