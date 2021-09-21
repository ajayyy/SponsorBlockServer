/**
 * Duplicated from Mocha types. TypeScript doesn't infer that type by itself for some reason.
 */
export type Done = (err?: any) => void;

export const postJSON = {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
};