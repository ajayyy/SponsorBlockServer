import assert from "assert";
import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
import { config } from "../../src/config";
import sinon from "sinon";
let dbVersion: number;

describe("getStatus", () => {
    const endpoint = "/api/status";
    before(async () => {
        dbVersion = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
    });

    it("Should be able to get status", () =>
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.ok(data.uptime); // uptime should be greater than 1s
                assert.strictEqual(data.commit, "test");
                assert.strictEqual(data.db, Number(dbVersion));
                assert.ok(data.startTime);
                assert.ok(data.processTime >= 0);
                assert.ok(data.loadavg.length == 2);
            })
    );

    it("Should be able to get uptime only", () =>
        client.get(`${endpoint}/uptime`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(Number(res.data) >= 1); // uptime should be greater than 1s
            })
    );

    it("Should be able to get commit only", () =>
        client.get(`${endpoint}/commit`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data, "test"); // commit should be test
            })
    );

    it("Should be able to get db only", () =>
        client.get(`${endpoint}/db`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(Number(res.data), Number(dbVersion)); // commit should be test
            })
    );

    it("Should be able to get startTime only", () =>
        client.get(`${endpoint}/startTime`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const now = Date.now();
                assert.ok(Number(res.data) <= now); // startTime should be more than now
            })
    );

    it("Should be able to get processTime only", () =>
        client.get(`${endpoint}/processTime`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(Number(res.data) >= 0);
            })
    );

    it("Should be able to get loadavg only", () =>
        client.get(`${endpoint}/loadavg`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(Number(res.data[0]) >= 0);
                assert.ok(Number(res.data[1]) >= 0);
            })
    );

    it("Should be able to get statusRequests only", function () {
        if (!config.redis?.enabled) this.skip();
        return client.get(`${endpoint}/statusRequests`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(Number(res.data) > 1);
            });
    });

    it("Should be able to get status with statusRequests", function () {
        if (!config.redis?.enabled) this.skip();
        return client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.ok(data.statusRequests > 2);
            });
    });

    it("Should be able to get redis latency", function () {
        if (!config.redis?.enabled) this.skip();
        return client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.ok(data.redisProcessTime >= 0);
            });
    });

    it("Should return commit unkown if not present", (done) => {
        sinon.stub((global as any), "HEADCOMMIT").value(undefined);
        client.get(`${endpoint}/commit`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data, "test"); // commit should be test
                done();
            })
            .catch(err => done(err));
        sinon.restore();
    });
});
