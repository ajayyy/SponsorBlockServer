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
                assert.ok(data.uptime >= 1); // uptime should be greater than 1s
                assert.strictEqual(data.commit, "test");
                assert.strictEqual(data.db, Number(dbVersion));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get uptime only", (done: Done) => {
        fetch(`${getbaseURL()}/api/status/uptime`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.text();
                console.log(data);
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
                console.log(data);
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
                console.log(data);
                assert.strictEqual(Number(data), Number(dbVersion)); // commit should be test
                done();
            })
            .catch(err => done(err));
    });
});
