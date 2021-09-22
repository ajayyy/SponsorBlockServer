import assert from "assert";
import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
let dbVersion: number;

describe("getStatus", () => {
    const endpoint = "/api/status";
    before(async () => {
        dbVersion = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
    });

    it("Should be able to get status", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.ok(data.uptime); // uptime should be greater than 1s
                assert.strictEqual(data.commit, "test");
                assert.strictEqual(data.db, Number(dbVersion));
                assert.ok(data.startTime);
                assert.ok(data.processTime >= 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get uptime only", (done) => {
        client.get(`${endpoint}/uptime`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(Number(res.data) >= 1); // uptime should be greater than 1s
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get commit only", (done) => {
        client.get(`${endpoint}/commit`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data, "test"); // commit should be test
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get db only", (done) => {
        client.get(`${endpoint}/db`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(Number(res.data), Number(dbVersion)); // commit should be test
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get startTime only", (done) => {
        client.get(`${endpoint}/startTime`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const now = Date.now();
                assert.ok(Number(res.data) <= now); // startTime should be more than now
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get processTime only", (done) => {
        client.get(`${endpoint}/processTime`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(Number(res.data) >= 0);
                done();
            })
            .catch(err => done(err));
    });
});
