import { Request } from "express";
import { ActionType, SegmentUUID, Category, DeArrowType } from "../types/segments.model";
import { config } from "../config";

type fn = (req: Request, fallback: any) => any[];

const syntaxErrorWrapper = (fn: fn, req: Request, fallback: any) => {
    try { return fn(req, fallback); }
    catch (e) {
        return undefined;
    }
};

const getQueryList = <T>(req: Request, fallback: T[], param: string, paramPlural: string): string[] | T[] =>
    req.query[paramPlural]
        ? JSON.parse(req.query[paramPlural] as string)
        : req.query[param]
            ? Array.isArray(req.query[param])
                ? req.query[param]
                : [req.query[param]]
            : fallback;

const getCategories = (req: Request, fallback: Category[] ): string[] | Category[] =>
    getQueryList(req, fallback, "category", "categories");

const getDeArrowTypes = (req: Request, fallback: DeArrowType[] ): string[] | DeArrowType[] =>
    getQueryList(req, fallback, "deArrowType", "deArrowTypes");

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

export const filterInvalidCategoryActionType = (categories: Category[], actionTypes: ActionType[]): Category[] =>
    categories.filter((category: Category) => filterActionType(actionTypes).includes(category));

const getActionTypes = (req: Request, fallback: ActionType[]): ActionType[] =>
    req.query.actionTypes
        ? JSON.parse(req.query.actionTypes as string)
        : req.query.actionType
            ? Array.isArray(req.query.actionType)
                ? req.query.actionType
                : [req.query.actionType]
            : fallback;

// fallback to empty array
const getRequiredSegments = (req: Request): SegmentUUID[] =>
    req.query.requiredSegments
        ? JSON.parse(req.query.requiredSegments as string)
        : req.query.requiredSegment
            ? Array.isArray(req.query.requiredSegment)
                ? req.query.requiredSegment
                : [req.query.requiredSegment]
            : [];

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

export const parseRequiredSegments = (req: Request): SegmentUUID[] | undefined =>
    syntaxErrorWrapper(getRequiredSegments, req, []); // never fall back

export const validateCategories = (categories: string[]): boolean =>
    categories.every((category: string) => config.categoryList.includes(category));