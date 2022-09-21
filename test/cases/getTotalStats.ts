import assert from "assert";
import { client } from "../utils/httpClient";

const endpoint = "/api/getTotalStats";

describe("getTotalStats", () => {
    it("Can get total stats", async () => {
        const result = await client({ url: endpoint });
        const data = result.data;
        assert.ok(data.userCount >= 0);
        assert.ok(data.activeUsers >= 0);
        assert.ok(data.apiUsers >= 0);
        assert.ok(data.viewCount >= 0);
        assert.ok(data.totalSubmissions >= 0);
        assert.ok(data.minutesSaved >= 0);
    });
});