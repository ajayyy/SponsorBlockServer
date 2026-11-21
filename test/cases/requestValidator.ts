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
                { ruleName: "Untitled rule 1", action: "drop" },
            );
        });
        it("case insensitive match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asDfg",
                }),
                { ruleName: "Untitled rule 1", action: "drop" },
            );
        });
        it("simple expected no match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "125aaa",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing field - no match", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "Testing rule", action: "drop" },
            );
        });
        it("different casing", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asDfg",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("extra field match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "Testing rule", action: "drop" },
            );
        });
        it("simple expected no match", () => {
            assert.equal(
                compiledRuleset({
                    userID: "125aaa",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing field - no match", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "Testing rule", action: "drop" },
            );
        });
        it("only matching one pattern - fail #1", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asDfg",
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("only matching one pattern - fail #2", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                    userAgent: "ReVanced/20.07.39",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing one of the fields - fail #1", () => {
            assert.equal(
                compiledRuleset({
                    userID: "asdfg",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing one of the fields - fail #2", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0 Chromeium/213.7",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing all fields - fail", () => {
            assert.equal(
                compiledRuleset({
                    videoDuration: 21.37,
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "Testing rule", action: "drop" },
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
                { ruleName: "Testing rule", action: "drop" },
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
                { ruleName: "Testing rule", action: "drop" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("zero segments", () => {
            assert.equal(
                compiledRuleset({
                    segments: [],
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing segments", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "Testing rule", action: "drop" },
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
                { ruleName: "Testing rule", action: "drop" },
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
                { ruleName: "Testing rule", action: "drop" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("zero segments", () => {
            assert.equal(
                compiledRuleset({
                    segments: [],
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing segments", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "Testing rule", action: "drop" },
            );
        });
        it("simple expected no match", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                    },
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing field - no match", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "Testing rule", action: "drop" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing field - no match #1", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing field - no match #2", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                    },
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "Rule one", action: "drop" },
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
                { ruleName: "Rule one", action: "drop" },
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
                { ruleName: "Untitled rule 1", action: "drop" },
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
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing both fields #1", () => {
            assert.equal(
                compiledRuleset({
                    userAgent: "Mozilla/5.0",
                }),
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
        it("missing both fields #2", () => {
            assert.equal(
                compiledRuleset({
                    dearrow: {
                        downvote: false,
                    },
                }),
                { ruleName: "implicit accept rule", action: "accept" },
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
                { ruleName: "implicit accept rule", action: "accept" },
            );
        });
    });
});
