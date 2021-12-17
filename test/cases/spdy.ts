import assert from "assert";
import { config } from "../../src/config";
import spdy from "spdy";
import https from "https";

const agent = spdy.createAgent({
    port: config.spdyPort,
    spdy: {
        ssl: false
    }
})

const options = {
    host: "localhost",
    port: config.spdyPort,
    path: "/api/status",
    agent: agent
};

describe("spdy getStatus", () => {
    it("Should be able to get status", (done) => {
        https.get(options, (res) => {
            console.log(res);
            /*
            assert.strictEqual(res.status, 200);
            const data = res.data;
            assert.ok(data.uptime); // uptime should be greater than 1s
            assert.strictEqual(data.commit, "test");
            assert.strictEqual(data.db, Number(dbVersion));
            assert.ok(data.startTime);
            assert.ok(data.processTime >= 0);
            assert.ok(data.loadavg.length == 2);
            done();
            */
            agent.close();
            done();
        });
    });
});