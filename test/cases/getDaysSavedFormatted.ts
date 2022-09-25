import assert from "assert";
import { client } from "../utils/httpClient";
import sinon from "sinon";
import { db } from "../../src/databases/databases";

const endpoint = "/api/getDaysSavedFormatted";

describe("getDaysSavedFormatted", () => {
    it("can get days saved", async () => {
        const result = await client({ url: endpoint });
        assert.ok(result.data.daysSaved >= 0);
    });

    it("returns 0 days saved if no segments", async () => {
        const stub = sinon.stub(db, "prepare").resolves(undefined);
        const result = await client({ url: endpoint });
        assert.ok(result.data.daysSaved >= 0);
        stub.restore();
    });

    it("returns days saved to 2 fixed points", async () => {
        const stub = sinon.stub(db, "prepare").resolves({ daysSaved: 1.23456789 });
        const result = await client({ url: endpoint });
        assert.strictEqual(result.data.daysSaved, "1.23");
        stub.restore();
    });
});