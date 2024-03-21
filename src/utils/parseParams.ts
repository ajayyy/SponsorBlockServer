import { Request } from "express";
import { ActionType, SegmentUUID, Category, DeArrowType } from "../types/segments.model";
import { config } from "../config";

type fn = (req: Request, fallback: any) => any[];

// generic parsing handlers
const syntaxErrorWrapper = (fn: fn, req: Request, fallback: any) => {
    try { return fn(req, fallback); }
    catch (e) {
        return undefined;
    }
};

/**
 * This function acts as a parser for singular and plural query parameters
 * either as arrays, strings as arrays or singular values with optional fallback
 * The priority is to parse the plural parameter natively, then with JSON
 * then the singular parameter as an array, then as a single value
 * and then finally fall back to the fallback value
 * @param req Axios Request object
 * @param fallback fallback value in case all parsing fail
 * @param param Name of singular parameter
 * @param paramPlural Name of plural parameter
 * @returns Array of values
 */
const getQueryList = <T>(req: Request, fallback: T[], param: string, paramPlural: string): string[] | T[] =>
    req.query[paramPlural]
        ? Array.isArray(req.query[paramPlural])
            ? req.query[paramPlural]
            : JSON.parse(req.query[paramPlural] as string)
        : req.query[param]
            ? Array.isArray(req.query[param])
                ? req.query[param]
                : [req.query[param]]
            : fallback;

// specfic parsing handlers
const getCategories = (req: Request, fallback: Category[] ): string[] | Category[] =>
    getQueryList(req, fallback, "category", "categories");

const getDeArrowTypes = (req: Request, fallback: DeArrowType[] ): string[] | DeArrowType[] =>
    getQueryList(req, fallback, "deArrowType", "deArrowTypes");

const getActionTypes = (req: Request, fallback: ActionType[]): string[] | ActionType[] =>
    getQueryList(req, fallback, "actionType", "actionTypes");

const getRequiredSegments = (req: Request): string[] | SegmentUUID[] =>
    getQueryList(req, [], "requiredSegment", "requiredSegments");

const getUUIDs = (req: Request): string[] | SegmentUUID[] =>
    getQueryList(req, [], "UUID", "UUIDs");


// validation handlers
const validateString = (array: any[]): any[] => {
    if (!Array.isArray(array)) return undefined;
    return array
        .filter((item: any) => typeof item === "string")
        .filter((item: string) => !(/[^a-z|_|-]/.test(item)));
};

const filterActionType = (actionTypes: ActionType[]) => {
    const filterCategories = new Set();
    for (const [key, value] of Object.entries(config.categorySupport)) {
        for (const type of actionTypes) {
            if (value.includes(type)) {
                filterCategories.add(key as Category);
            }
        }
    }
    return [...filterCategories];
};

const validateUUID = (array: string[]): SegmentUUID[] => {
    if (!Array.isArray(array)) return undefined;
    const filtered = array
        .filter((item: string) => typeof item === "string")
        .filter((item: string) => /^([a-f0-9]{64,65}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(item));
    return filtered as SegmentUUID[];
};

export const filterInvalidCategoryActionType = (categories: Category[], actionTypes: ActionType[]): Category[] =>
    categories.filter((category: Category) => filterActionType(actionTypes).includes(category));

export const parseCategories = (req: Request, fallback: Category[]): Category[] => {
    const categories = syntaxErrorWrapper(getCategories, req, fallback);
    return categories ? validateString(categories) : undefined;
};

export const parseActionTypes = (req: Request, fallback: ActionType[]): ActionType[] => {
    const actionTypes = syntaxErrorWrapper(getActionTypes, req, fallback);
    return actionTypes ? validateString(actionTypes) : undefined;
};

export const parseDeArrowTypes = (req: Request, fallback: DeArrowType[]): DeArrowType[] => {
    const deArrowTypes = syntaxErrorWrapper(getDeArrowTypes, req, fallback);
    return deArrowTypes ? validateString(deArrowTypes) : undefined;
};

export const parseRequiredSegments = (req: Request): SegmentUUID[] | undefined => {
    // fall back to empty array
    // we do not do regex validation since required segments can be partial UUIDs on videos
    return syntaxErrorWrapper(getRequiredSegments, req, []);
};

export const parseUUIDs = (req: Request): SegmentUUID[] | undefined => {
    const UUIDs = syntaxErrorWrapper(getUUIDs, req, []); // fall back to empty array
    return UUIDs ? validateUUID(UUIDs) : undefined;
};

export const validateCategories = (categories: string[]): boolean =>
    categories.every((category: string) => config.categoryList.includes(category));