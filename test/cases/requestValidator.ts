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
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                }),
                "Untitled rule 1",
            );
        });
        it("case insensitive match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asDfg",
                }),
                "Untitled rule 1",
            );
        });
        it("simple expected no match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "125aaa",
                }),
                null,
            );
        });
        it("missing field - no match", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                null,
            );
        });
    });

    describe("single case sensitive rule with name", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                ruleName: "Testing rule",
                // tuple patterns allow setting regex flags
                userID: ["^[a-z]+$", ""],
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                }),
                "Testing rule",
            );
        });
        it("different casing", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asDfg",
                }),
                null,
            );
        });
        it("extra field match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                    userAgent: "Mozilla/5.0",
                }),
                "Testing rule",
            );
        });
        it("simple expected no match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "125aaa",
                }),
                null,
            );
        });
        it("missing field - no match", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                null,
            );
        });
    });

    describe("2-pattern rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                ruleName: "Testing rule",
                userID: ["^[a-z]+$", ""],
                userAgent: "^Mozilla/5\\.0",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
                "Testing rule",
            );
        });
        it("only matching one pattern - fail #1", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asDfg",
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
                null,
            );
        });
        it("only matching one pattern - fail #2", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                    userAgent: "ReVanced/20.07.39",
                }),
                null,
            );
        });
        it("missing one of the fields - fail #1", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                }),
                null,
            );
        });
        it("missing one of the fields - fail #2", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
                null,
            );
        });
        it("missing all fields - fail", () => {
            assert.equal(
                compiledRuleset({
                    videoDuration: 21.37,
                }),
                null,
            );
        });
    });

    describe("1-pattern segment rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                ruleName: "Testing rule",
                description: "mini_bomba",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.equal(
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
                "Testing rule",
            );
        });
        it("match on one of multiple segments", () => {
            assert.equal(
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
                "Testing rule",
            );
        });
        it("match on one of multiple segments with other missing field", () => {
            assert.equal(
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
                "Testing rule",
            );
        });
        it("no match with one segment", () => {
            assert.equal(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                    ],
                }),
                null,
            );
        });
        it("no match with multiple segments", () => {
            assert.equal(
                compiledRuleset({
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
                null,
            );
        });
        it("one segment missing field", () => {
            assert.equal(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
                null,
            );
        });
        it("multiple segments missing field", () => {
            assert.equal(
                compiledRuleset({
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
                null,
            );
        });
        it("zero segments", () => {
            assert.equal(
                compiledRuleset({
                    segments: [],
                }),
                null,
            );
        });
        it("missing segments", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                null,
            );
        });
    });

    describe("2-pattern segment rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                ruleName: "Testing rule",
                description: "mini_bomba",
                startTime: "\\.\\d",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.equal(
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
                "Testing rule",
            );
        });
        it("match on one of multiple segments", () => {
            assert.equal(
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
                "Testing rule",
            );
        });
        it("match on one of multiple segments with other missing field", () => {
            assert.equal(
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
                "Testing rule",
            );
        });
        it("no match with one segment #1", () => {
            assert.equal(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                    ],
                }),
                null,
            );
        });
        it("no match with one segment #2", () => {
            assert.equal(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1.1", "2"],
                            category: "chapter" as Category,
                            actionType: "chapter" as ActionType,
                            description: "aaaa",
                        },
                    ],
                }),
                null,
            );
        });
        it("no match with one segment #2", () => {
            assert.equal(
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
                null,
            );
        });
        it("no match with multiple segments", () => {
            assert.equal(
                compiledRuleset({
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
                null,
            );
        });
        it("no match with multiple segments with partial matches", () => {
            assert.equal(
                compiledRuleset({
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
                null,
            );
        });
        it("one segment missing field", () => {
            assert.equal(
                compiledRuleset({
                    segments: [
                        {
                            segment: ["1", "2"],
                            category: "sponsor" as Category,
                            actionType: "skip" as ActionType,
                        },
                    ],
                }),
                null,
            );
        });
        it("multiple segments missing field", () => {
            assert.equal(
                compiledRuleset({
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
                null,
            );
        });
        it("zero segments", () => {
            assert.equal(
                compiledRuleset({
                    segments: [],
                }),
                null,
            );
        });
        it("missing segments", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                null,
            );
        });
    });

    describe("boolean rule", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                ruleName: "Testing rule",
                dearrowDownvote: true,
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: true,
                    },
                }),
                "Testing rule",
            );
        });
        it("simple expected no match", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                    },
                }),
                null,
            );
        });
        it("missing field - no match", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                null,
            );
        });
    });

    describe("mixed type rules", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                ruleName: "Testing rule",
                titleOriginal: true,
                title: "mini_bomba",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("simple expected match", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: true,
                        },
                    },
                }),
                "Testing rule",
            );
        });
        it("simple expected no match", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: false,
                        },
                    },
                }),
                null,
            );
        });
        it("partial match #1", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: false,
                        },
                    },
                }),
                null,
            );
        });
        it("partial match #2", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: true,
                        },
                    },
                }),
                null,
            );
        });
        it("missing field - no match #1", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                null,
            );
        });
        it("missing field - no match #2", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                    },
                }),
                null,
            );
        });
        it("missing field - no match #3", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        thumbnail: {
                            original: true,
                        },
                    },
                }),
                null,
            );
        });
    });

    describe("two-rule ruleset", () => {
        const ruleset: RequestValidatorRule[] = [
            {
                ruleName: "Rule one",
                titleOriginal: true,
            },
            {
                title: "mini_bomba",
            },
        ];
        let compiledRuleset: CompiledValidityCheck;

        before(() => {
            compiledRuleset = compileRules(ruleset);
        });

        it("matches both", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: true,
                        },
                    },
                }),
                "Rule one",
            );
        });
        it("matches 1", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: true,
                        },
                    },
                }),
                "Rule one",
            );
        });
        it("matches 2", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mini_bomba gaming",
                            original: false,
                        },
                    },
                }),
                "Untitled rule 1",
            );
        });
        it("no match", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        title: {
                            title: "mschae restaurant",
                            original: false,
                        },
                    },
                }),
                null,
            );
        });
        it("missing both fields #1", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                null,
            );
        });
        it("missing both fields #2", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                    },
                }),
                null,
            );
        });
        it("missing both fields #3", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                        thumbnail: {
                            original: true,
                        },
                    },
                }),
                null,
            );
        });
    });
});
