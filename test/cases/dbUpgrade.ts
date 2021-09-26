import assert from "assert";

import { db, privateDB } from "../../src/databases/databases";

describe("dbUpgrade", () => {
    it("Should update the database version when starting the application", async () => {
        const dbVersion = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        const privateVersion = (await privateDB.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;

        assert(
            dbVersion >= 1 && privateVersion >= 1,
            `Versions are not at least 1. db is ${dbVersion}, private is ${privateVersion}`);
    });
});
