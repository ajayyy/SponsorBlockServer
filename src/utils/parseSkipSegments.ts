import { Request } from "express";
import { ActionType, SegmentUUID, Category, Service } from "../types/segments.model";
import { getService } from "./getService";

import { parseCategories, parseActionTypes, parseRequiredSegments } from "./parseParams";

const errorMessage = (parameter: string) => `${parameter} parameter does not match format requirements.`;

export function parseSkipSegments(req: Request): {
    categories: Category[];
    actionTypes: ActionType[];
    trimUUIDs: number | null;
    requiredSegments: SegmentUUID[];
    service: Service;
    errors: string[];
} {
    const categories: Category[] = parseCategories(req, [ "sponsor" as Category ]);
    const actionTypes: ActionType[] = parseActionTypes(req, [ActionType.Skip]);
    const trimUUIDs: number | null = req.query.trimUUIDs ? (parseInt(req.query.trimUUIDs as string) || null) : null;
    const requiredSegments: SegmentUUID[] = parseRequiredSegments(req);
    const service: Service = getService(req.query.service, req.body.services);
    const errors: string[] = [];
    if (!Array.isArray(categories)) errors.push(errorMessage("categories"));
    else if (categories.length === 0) errors.push("No valid categories provided.");

    if (!Array.isArray(actionTypes)) errors.push(errorMessage("actionTypes"));
    if (!Array.isArray(requiredSegments)) errors.push(errorMessage("requiredSegments"));
    // finished parsing
    return {
        categories,
        actionTypes,
        trimUUIDs,
        requiredSegments,
        service,
        errors
    };
}