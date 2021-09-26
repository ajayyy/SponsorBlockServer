import assert from "assert";
import { partialDeepEquals } from "../utils/partialDeepEquals";

describe("Test utils ", () => {
    it("objectContain", () => {
        assert(partialDeepEquals(
            {
                name: "John Wick",
                old: 20,
                vip: true
            },
            {

            },
            false
        ), "Did not match empty expect");
        assert(partialDeepEquals(
            [{ a: [1,2,3] }, { a: [1,2] }],
            [{ a: [1,2,3] }, { a: [1,2] }]
        ), "Did not match same arrays");
        assert(partialDeepEquals(
            {
                name: "John Wick",
                old: 20,
                vip: true
            },
            {
                vip: true,
                old: 20
            }
        ), "Did not match same partial properties");
        // do not match incorrect propeties
        assert(!partialDeepEquals(
            {
                name: "John Wick",
                old: 20,
                vip: true
            },
            {
                vip: false,
                old: 19
            },
            false
        ), "Matched different properties");
        // do not match missing property
        assert(!partialDeepEquals(
            {
                name: "John Wick",
                old: 20,
                vip: true
            },
            {
                vip: true,
                child: {
                    name: ""
                }
            },
            false
        ));
        assert(!partialDeepEquals(
            {
                name: "John Wick",
                old: 20,
                vip: true,
                child: {
                    name: "a"
                }
            },
            {
                vip: true,
                child: {
                    name: ""
                }
            },
            false
        ), "Matched incorrect child property");
        assert(!partialDeepEquals(
            {
                name: "John Wick",
                old: 20,
                vip: true,
                child: {
                    name: "a",
                    child: {
                        name: "a",
                    }
                }
            },
            {
                vip: true,
                child: {
                    name: "a",
                    child: {
                        name: "b",
                    }
                }
            },
            false
        ), "Matched incorrected 2-nested property");
        assert(partialDeepEquals(
            {
                name: "John Wick",
                old: 20,
                vip: true,
                child: {
                    name: "a",
                    child: {
                        name: "b",
                    }
                }
            },
            {
                vip: true,
                child: {
                    name: "a",
                    child: {
                        name: "b",
                    }
                }
            }
        ), "Did not match exact child properties");
        assert(partialDeepEquals(
            {
                name: "John Wick",
                values: [{
                    name: "a",
                }, {
                    name: "b",
                }]
            },
            {
                values: [{
                    name: "a",
                }]
            }
        ), "Did not match partial child array");
    });
});