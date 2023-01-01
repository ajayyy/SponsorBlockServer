import { Request } from "express";
import { ActionType, SegmentUUID, Category, Service } from "../types/segments.model";
import { getService } from "./getService";

type fn = (req: Request) => any[];

const syntaxErrorWrapper = (fn: fn, req: Request) => {
    try { return fn(req); }
    catch (e) { return undefined; }
};

// Default to sponsor
const getCategories = (req: Request): Category[] =>
    req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? Array.isArray(req.query.category)
                ? req.query.category
                : [req.query.category]
            : ["sponsor"];

// Default to skip
const getActionTypes = (req: Request): ActionType[] =>
    req.query.actionTypes
        ? JSON.parse(req.query.actionTypes as string)
        : req.query.actionType
            ? Array.isArray(req.query.actionType)
                ? req.query.actionType
                : [req.query.actionType]
            : [ActionType.Skip];

// Default to empty array
const getRequiredSegments = (req: Request): SegmentUUID[] =>
    req.query.requiredSegments
        ? JSON.parse(req.query.requiredSegments as string)
        : req.query.requiredSegment
            ? Array.isArray(req.query.requiredSegment)
                ? req.query.requiredSegment
                : [req.query.requiredSegment]
            : [];

const errorMessage = (parameter: string) => `${parameter} parameter does not match format requirements.`;

export function parseSkipSegments(req: Request): {
    categories: Category[];
    actionTypes: ActionType[];
    requiredSegments: SegmentUUID[];
    service: Service;
    errors: string[];
} {
    let categories: Category[] = syntaxErrorWrapper(getCategories, req);
    const actionTypes: ActionType[] = syntaxErrorWrapper(getActionTypes, req);
    const requiredSegments: SegmentUUID[] = syntaxErrorWrapper(getRequiredSegments, req);
    const service: Service = getService(req.query.service, req.body.services);
    const errors: string[] = [];
    if (!Array.isArray(categories)) errors.push(errorMessage("categories"));
    else {
        // check category names for invalid characters
        // and none string elements
        categories = categories
            .filter((item: any) => typeof item === "string")
            .filter((category) => !(/[^a-z|_|-]/.test(category)));
        if (categories.length === 0) errors.push("No valid categories provided.");
    }
    if (!Array.isArray(actionTypes)) errors.push(errorMessage("actionTypes"));
    if (!Array.isArray(requiredSegments)) errors.push(errorMessage("requiredSegments"));
    // finished parsing
    return {
        categories,
        actionTypes,
        requiredSegments,
        service,
        errors
    };
}