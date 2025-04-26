import { config } from "../config";
import {
    CasualCategory,
    ThumbnailSubmission,
    TitleSubmission,
} from "../types/branding.model";
import { ValidatorPattern, RequestValidatorRule } from "../types/config.model";
import { IncomingSegment } from "../types/segments.model";

export interface RequestValidatorInput {
    userAgent?: string;
    userAgentHeader?: string;
    videoDuration?: string | number;
    videoID?: string;
    userID?: string;
    service?: string;
    segments?: IncomingSegment[];
    dearrow?: {
        title?: TitleSubmission;
        thumbnail?: ThumbnailSubmission;
        downvote: boolean;
    };
    casualCategories?: CasualCategory[];
    newUsername?: string;
    endpoint?: string;
}
export type CompiledValidityCheck = (input: RequestValidatorInput) => string | null;
type CompiledPatternCheck = (input: RequestValidatorInput) => boolean;
type CompiledSegmentCheck = (input: IncomingSegment) => boolean;
type InputExtractor = (
    input: RequestValidatorInput,
) => string | number | undefined | null;
type SegmentExtractor = (input: IncomingSegment) => string | undefined | null;
type BooleanRules = "titleOriginal" | "thumbnailOriginal" | "dearrowDownvote";
type RuleEntry =
    | [Exclude<keyof RequestValidatorRule, BooleanRules>, ValidatorPattern]
    | [BooleanRules, boolean];

let compiledRules: CompiledValidityCheck;

function patternToRegex(pattern: ValidatorPattern): RegExp {
    return typeof pattern === "string"
        ? new RegExp(pattern, "i")
        : new RegExp(...pattern);
}

function compilePattern(
    pattern: ValidatorPattern,
    extractor: InputExtractor,
): CompiledPatternCheck {
    const regex = patternToRegex(pattern);

    return (input: RequestValidatorInput) => {
        const field = extractor(input);
        if (field == undefined) return false;
        return regex.test(String(field));
    };
}

function compileSegmentPattern(
    pattern: ValidatorPattern,
    extractor: SegmentExtractor,
): CompiledSegmentCheck {
    const regex = patternToRegex(pattern);

    return (input: IncomingSegment) => {
        const field = extractor(input);
        if (field == undefined) return false;
        return regex.test(field);
    };
}

export function compileRules(
    ruleDefinitions: RequestValidatorRule[],
): CompiledValidityCheck {
    if (ruleDefinitions.length === 0) return () => null;

    const rules: CompiledValidityCheck[] = [];
    let untitledRuleCounter = 0;
    for (const ruleDefinition of ruleDefinitions) {
        const ruleComponents: CompiledPatternCheck[] = [];
        const segmentRuleComponents: CompiledSegmentCheck[] = [];
        for (const [ruleKey, rulePattern] of Object.entries(
            ruleDefinition,
        ) as RuleEntry[]) {
            switch (ruleKey) {
                case "userAgent":
                    ruleComponents.push(
                        compilePattern(rulePattern, (input) => input.userAgent),
                    );
                    break;
                case "userAgentHeader":
                    ruleComponents.push(
                        compilePattern(
                            rulePattern,
                            (input) => input.userAgentHeader,
                        ),
                    );
                    break;
                case "videoDuration":
                    ruleComponents.push(
                        compilePattern(
                            rulePattern,
                            (input) => input.videoDuration,
                        ),
                    );
                    break;
                case "videoID":
                    ruleComponents.push(
                        compilePattern(rulePattern, (input) => input.videoID),
                    );
                    break;
                case "userID":
                    ruleComponents.push(
                        compilePattern(rulePattern, (input) => input.userID),
                    );
                    break;
                case "service":
                    ruleComponents.push(
                        compilePattern(rulePattern, (input) => input.service),
                    );
                    break;
                case "startTime":
                    segmentRuleComponents.push(
                        compileSegmentPattern(
                            rulePattern,
                            (input) => input.segment[0],
                        ),
                    );
                    break;
                case "endTime":
                    segmentRuleComponents.push(
                        compileSegmentPattern(
                            rulePattern,
                            (input) => input.segment[1],
                        ),
                    );
                    break;
                case "category":
                    segmentRuleComponents.push(
                        compileSegmentPattern(
                            rulePattern,
                            (input) => input.category,
                        ),
                    );
                    break;
                case "actionType":
                    segmentRuleComponents.push(
                        compileSegmentPattern(
                            rulePattern,
                            (input) => input.actionType,
                        ),
                    );
                    break;
                case "description":
                    segmentRuleComponents.push(
                        compileSegmentPattern(
                            rulePattern,
                            (input) => input.description,
                        ),
                    );
                    break;
                case "title":
                    ruleComponents.push(
                        compilePattern(
                            rulePattern,
                            (input) => input.dearrow?.title?.title,
                        ),
                    );
                    break;
                case "titleOriginal":
                    ruleComponents.push(
                        (input) =>
                            input.dearrow?.title?.original === rulePattern,
                    );
                    break;
                case "thumbnailTimestamp":
                    ruleComponents.push(
                        compilePattern(
                            rulePattern,
                            (input) => input.dearrow?.thumbnail?.timestamp,
                        ),
                    );
                    break;
                case "thumbnailOriginal":
                    ruleComponents.push(
                        (input) =>
                            input.dearrow?.thumbnail?.original === rulePattern,
                    );
                    break;
                case "dearrowDownvote":
                    ruleComponents.push(
                        (input) => input.dearrow?.downvote === rulePattern,
                    );
                    break;
                case "newUsername":
                    ruleComponents.push(
                        compilePattern(
                            rulePattern,
                            (input) => input.newUsername,
                        ),
                    );
                    break;
                case "endpoint":
                    ruleComponents.push(
                        compilePattern(rulePattern, (input) => input.endpoint),
                    );
                    break;
                case "casualCategory": {
                    const regex = patternToRegex(rulePattern);
                    ruleComponents.push((input) => {
                        if (input.casualCategories === undefined) {
                            return false;
                        }
                        for (const category of input.casualCategories) {
                            if (regex.test(category)) return true;
                        }
                        return false;
                    });
                    break;
                }
                case "ruleName":
                    // not a rule component
                    break;
                default: {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _exhaustive: never = ruleKey;
                }
            }
        }
        if (segmentRuleComponents.length > 0) {
            ruleComponents.push((input) => {
                if (input.segments === undefined) return false;
                for (const segment of input.segments) {
                    let result = true;
                    for (const rule of segmentRuleComponents) {
                        if (!rule(segment)) {
                            result = false;
                            break;
                        }
                    }
                    if (result) return true;
                }
                return false;
            });
        }
        const ruleName = ruleDefinition.ruleName ?? `Untitled rule ${++untitledRuleCounter}`;
        rules.push((input) => {
            for (const rule of ruleComponents) {
                if (!rule(input)) return null;
            }
            return ruleName;
        });
    }
    return (input) => {
        for (const rule of rules) {
            const result = rule(input);
            if (result !== null) return result;
        }
        return null;
    };
}

export function isRequestInvalid(input: RequestValidatorInput): string | null {
    compiledRules ??= compileRules(config.requestValidatorRules);
    return compiledRules(input);
}
