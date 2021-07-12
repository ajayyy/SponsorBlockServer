import { Category, CategoryActionType } from "../types/segments.model";

export function getCategoryActionType(category: Category): CategoryActionType {
    switch (category) {
    case "highlight":
        return CategoryActionType.POI;
    default:
        return CategoryActionType.Skippable;
    }
}
