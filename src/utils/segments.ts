import { ActionType, Category } from "../types/segments.model";

export interface CompareSegment {
    startTime: number;
    endTime: number;
    category: Category;
    actionType: ActionType;
}

export function segmentOverlapping(segment1: CompareSegment, segment2: CompareSegment): boolean {
    const overlap = Math.min(segment1.endTime, segment2.endTime) - Math.max(segment1.startTime, segment2.startTime);
    const overallDuration = Math.max(segment1.endTime, segment2.endTime) - Math.min(segment1.startTime, segment2.startTime);
    const overlapPercent = overlap / overallDuration;
    return (overlapPercent >= 0.1 && segment1.actionType === segment2.actionType && segment1.category === segment2.category && segment1.actionType !== ActionType.Chapter)
        || (overlapPercent >= 0.6 && segment1.actionType !== segment2.actionType && segment1.category === segment2.category)
        || (overlapPercent >= 0.8 && segment1.actionType === ActionType.Chapter && segment2.actionType === ActionType.Chapter);
}