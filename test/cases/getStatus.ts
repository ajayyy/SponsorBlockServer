import assert from "assert";
import fetch from "node-fetch";
import {Done, getbaseURL} from "../utils";

import {db} from "../../src/databases/databases";
let dbVersion: number;

describe("getStatus", () => {
    before(async () => {
        dbVersion = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
    });

    it("Should be able to get status", (done: Done) => {
        fetch(`${getbaseURL()}/api/status`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.ok(data.uptime); // uptime should be greater than 1s
                assert.strictEqual(data.commit, "test");
                assert.strictEqual(data.db, Number(dbVersion));
                assert.ok(data.startTime);
                assert.ok(data.processTime >= 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get uptime only", (done: Done) => {
        fetch(`${getbaseURL()}/api/status/uptime`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.text();
                assert.ok(Number(data) >= 1); // uptime should be greater than 1s
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get commit only", (done: Done) => {
        fetch(`${getbaseURL()}/api/status/commit`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.text();
                assert.strictEqual(data, "test"); // commit should be test
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get db only", (done: Done) => {
        fetch(`${getbaseURL()}/api/status/db`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.text();
                assert.strictEqual(Number(data), Number(dbVersion)); // commit should be test
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get startTime only", (done: Done) => {
        fetch(`${getbaseURL()}/api/status/startTime`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.text();
                const now = Date.now();
                assert.ok(Number(data) <= now); // startTime should be more than now
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get processTime only", (done: Done) => {
        fetch(`${getbaseURL()}/api/status/processTime`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.text();
                assert.ok(Number(data) >= 0);
                done();
            })
            .catch(err => done(err));
    });
});
