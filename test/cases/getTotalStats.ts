import assert from "assert";
import { client } from "../utils/httpClient";
import sinon from "sinon";
import * as getCWSUsers from "../../src/utils/getCWSUsers";

const endpoint = "/api/getTotalStats";

describe("getTotalStats", () => {
    it("Can get total stats", async () => {
        const result = await client({ url: endpoint });
        const data = result.data;
        assert.strictEqual(data.userCount, 0, "User count should default false");
        assert.ok(data.activeUsers >= 0);
        assert.ok(data.apiUsers >= 0);
        assert.ok(data.viewCount >= 0);
        assert.ok(data.totalSubmissions >= 0);
        assert.ok(data.minutesSaved >= 0);
    });

    it("Can get total stats without contributing users", async () => {
        const result = await client({ url: `${endpoint}?countContributingUsers=false` });
        const data = result.data;
        assert.strictEqual(data.userCount, 0);
        assert.ok(data.activeUsers >= 0);
        assert.ok(data.apiUsers >= 0);
        assert.ok(data.viewCount >= 0);
        assert.ok(data.totalSubmissions >= 0);
        assert.ok(data.minutesSaved >= 0);
    });

    it("Can get total stats with old cws method", async () => {
        const stub = sinon.stub(getCWSUsers, "getCWSUsers");
        stub.resolves(undefined);
        const result = await client({ url: `${endpoint}?countContributingUsers=true` });
        const data = result.data;
        assert.ok(data.userCount >= 0);
        assert.ok(data.activeUsers >= 0);
        assert.ok(data.apiUsers >= 0);
        assert.ok(data.viewCount >= 0);
        assert.ok(data.totalSubmissions >= 0);
        assert.ok(data.minutesSaved >= 0);
        stub.restore();
    });
});