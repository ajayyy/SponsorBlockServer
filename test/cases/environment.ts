import assert from "assert";
import { config } from "../../src/config";

describe("environment", () => {
    it("minUserIDLength should be < 10", () => {
        assert(config.minUserIDLength < 10);
    });
    it("nodeJS major version should be >= 16", () => {
        const [major] = process.versions.node.split(".").map(i => parseInt(i));
        assert(major >= 16);
    });
});
