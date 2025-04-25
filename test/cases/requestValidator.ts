import assert from "assert";
import { RequestValidatorRule } from "../../src/types/config.model";
import { ActionType, Category } from "../../src/types/segments.model";
import {
    CompiledValidityCheck,
    compileRules,
} from "../../src/utils/requestValidator";

describe("Request validator", () => {
    describe("single simple rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                // rules are case insensitive by default
                userID: "^[a-z]+$",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.ok(
                compiledRuleset({
                    userID: "asdfg",
                }),
            );
        });
        it("case insensitive match", () => {
            assert.ok(
                compiledRuleset({
                    userID: "asDfg",
                }),
            );
        });
        it("simple expected no match", () => {
            assert.ok(
                !compiledRuleset({
                    userID: "125aaa",
                }),
            );
        });
        it("missing field - no match", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
    });

    describe("single case sensitive rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                // tuple patterns allow setting regex flags
                userID: ["^[a-z]+$", ""],
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.ok(
                compiledRuleset({
                    userID: "asdfg",
                }),
            );
        });
        it("different casing", () => {
            assert.ok(
                !compiledRuleset({
                    userID: "asDfg",
                }),
            );
        });
        it("extra field match", () => {
            assert.ok(
                compiledRuleset({
                    userID: "asdfg",
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
        it("simple expected no match", () => {
            assert.ok(
                !compiledRuleset({
                    userID: "125aaa",
                }),
            );
        });
        it("missing field - no match", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
    });

    describe("2-pattern rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                userID: ["^[a-z]+$", ""],
                userAgent: "^Mozilla/5\\.0",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.ok(
                compiledRuleset({
                    userID: "asdfg",
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
            );
        });
        it("only matching one pattern - fail #1", () => {
            assert.ok(
                !compiledRuleset({
                    userID: "asDfg",
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
            );
        });
        it("only matching one pattern - fail #2", () => {
            assert.ok(
                !compiledRuleset({
                    userID: "asdfg",
                    userAgent: "ReVanced/20.07.39",
                }),
            );
        });
        it("missing one of the fields - fail #1", () => {
            assert.ok(
                !compiledRuleset({
                    userID: "asdfg",
                }),
            );
        });
        it("missing one of the fields - fail #2", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
            );
        });
        it("missing all fields - fail", () => {
            assert.ok(
                !compiledRuleset({
                    videoDuration: 21.37,
                }),
            );
        });
    });

    describe("1-pattern segment rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                description: "mini_bomba",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.ok(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                    ],
                }),
            );
        });
        it("match on one of multiple segments", () => {
            assert.ok(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaaa",
                        },
                    ],
                }),
            );
        });
        it("match on one of multiple segments with other missing field", () => {
            assert.ok(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
            );
        });
        it("no match with one segment", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                    ],
                }),
            );
        });
        it("no match with multiple segments", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "bbbbb",
                        },
                    ],
                }),
            );
        });
        it("one segment missing field", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
            );
        });
        it("multiple segments missing field", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                        {
                            segment: ["1", "2"],
                            category: "filler" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
            );
        });
        it("zero segments", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [],
                }),
            );
        });
        it("missing segments", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
    });

    describe("2-pattern segment rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                description: "mini_bomba",
                startTime: "\\.\\d",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.ok(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1.1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                    ],
                }),
            );
        });
        it("match on one of multiple segments", () => {
            assert.ok(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1.1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaaa",
                        },
                    ],
                }),
            );
        });
        it("match on one of multiple segments with other missing field", () => {
            assert.ok(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1.1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
            );
        });
        it("no match with one segment #1", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                    ],
                }),
            );
        });
        it("no match with one segment #2", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1.1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                    ],
                }),
            );
        });
        it("no match with one segment #2", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                    ],
                }),
            );
        });
        it("no match with multiple segments", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "bbbbb",
                        },
                    ],
                }),
            );
        });
        it("no match with multiple segments with partial matches", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1.1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "mini_bomba",
                        },
                    ],
                }),
            );
        });
        it("one segment missing field", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
            );
        });
        it("multiple segments missing field", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                        {
                            segment: ["1", "2"],
                            category: "filler" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
            );
        });
        it("zero segments", () => {
            assert.ok(
                !compiledRuleset({
                    segments: [],
                }),
            );
        });
        it("missing segments", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
    });

    describe("boolean rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                dearrowDownvote: true,
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.ok(
                compiledRuleset({
                    dearrow: {
                        downvote: true,
                    },
                }),
            );
        });
        it("simple expected no match", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                    },
                }),
            );
        });
        it("missing field - no match", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
    });

    describe("mixed type rules", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                titleOriginal: true,
                title: "mini_bomba",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.ok(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: true,
                        },
                    },
                }),
            );
        });
        it("simple expected no match", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: false,
                        },
                    },
                }),
            );
        });
        it("partial match #1", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: false,
                        },
                    },
                }),
            );
        });
        it("partial match #2", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: true,
                        },
                    },
                }),
            );
        });
        it("missing field - no match #1", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
        it("missing field - no match #2", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                    }
                }),
            );
        });
        it("missing field - no match #3", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                        thumbnail: {
                            original: true,
                        }
                    }
                }),
            );
        });
    });

    describe("two-rule ruleset", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                titleOriginal: true,
            },
            {
                title: "mini_bomba",
            }
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("matches both", () => {
            assert.ok(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: true,
                        },
                    },
                }),
            );
        });
        it("matches 1", () => {
            assert.ok(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: false,
                        },
                    },
                }),
            );
        });
        it("matches 2", () => {
            assert.ok(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: true,
                        },
                    },
                }),
            );
        });
        it("no match", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: false,
                        },
                    },
                }),
            );
        });
        it("missing both fields #1", () => {
            assert.ok(
                !compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
            );
        });
        it("missing both fields #2", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                    }
                }),
            );
        });
        it("missing both fields #3", () => {
            assert.ok(
                !compiledRuleset({
                    dearrow: {
                        downvote: false,
                        thumbnail: {
                            original: true,
                        }
                    }
                }),
            );
        });
    });
});
