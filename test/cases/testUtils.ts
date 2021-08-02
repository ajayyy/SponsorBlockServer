import assert from "assert";

import { objectContain } from "../utils";

describe("Test utils ", () => {
    it("objectContain", async () => {
        assert(objectContain(
            {
                name: "John Wick",
                old: 20,
                vip: true
            },
            {

            }
        ), "Not pass with empty expect");

        assert(objectContain(
            [{a: [1,2,3]}, {a: [1,2]}],
            [
                {a: {length: 3}},
                {a: {length: 2}}
            ]
        ));

        assert(objectContain(
            {
                name: "John Wick",
                old: 20,
                vip: true
            },
            {
                vip: true,
                old: 20
            }
        ));

        assert(!objectContain(
            {
                name: "John Wick",
                old: 20,
                vip: true
            },
            {
                vip: false,
                old: 19
            }
        ));

        assert(!objectContain(
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
            }
        ));

        assert(!objectContain(
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
            }
        ));

        assert(!objectContain(
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
            }
        ));

        assert(!objectContain(
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
            }
        ));

        assert(objectContain(
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
        ));
    });
});