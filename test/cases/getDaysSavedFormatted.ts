import assert from "assert";
import { client } from "../utils/httpClient";

const endpoint = "/api/getDaysSavedFormatted";

describe("getDaysSavedFormatted", () => {
    it("can get days saved", async () => {
        const result = await client({ url: endpoint });
        assert.ok(result.data.daysSaved >= 0);
    });
});