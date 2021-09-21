import { Category, CategoryActionType } from "../types/segments.model.js";

export function getCategoryActionType(category: Category): CategoryActionType {
    if (category.startsWith("poi_")) {
        return CategoryActionType.POI;
    } else {
        return CategoryActionType.Skippable;
    }
}
