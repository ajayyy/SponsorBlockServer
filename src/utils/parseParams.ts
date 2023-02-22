import { Request } from "express";
import { ActionType, SegmentUUID, Category } from "../types/segments.model";
import { config } from "../config";

type fn = (req: Request, fallback: any) => any[];

const syntaxErrorWrapper = (fn: fn, req: Request, fallback: any) => {
    try { return fn(req, fallback); }
    catch (e) {
        return undefined;
    }
};

const getCategories = (req: Request, fallback: Category[] ): string[] | Category[] =>
    req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? Array.isArray(req.query.category)
                ? req.query.category
                : [req.query.category]
            : fallback;

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

export const parseRequiredSegments = (req: Request): SegmentUUID[] | undefined =>
    syntaxErrorWrapper(getRequiredSegments, req, []); // never fall back

export const validateCategories = (categories: string[]): boolean =>
    categories.every((category: string) => config.categoryList.includes(category));