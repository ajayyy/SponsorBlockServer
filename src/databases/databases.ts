import { config } from "../config.js";
import { Postgres } from "./Postgres.js";
import { IDatabase } from "./IDatabase.js";
import { Logger } from "../utils/logger.js";

let db: IDatabase;
let privateDB: IDatabase;
if (config.postgres?.enabled) {
    db = new Postgres({
        dbSchemaFileName: config.dbSchema,
        dbSchemaFolder: config.schemaFolder,
        fileNamePrefix: "sponsorTimes",
        readOnly: config.readOnly,
        createDbIfNotExists: config.createDatabaseIfNotExist,
        postgres: {
            ...config.postgres,
            database: "sponsorTimes",
        },
        postgresReadOnly: config.postgresReadOnly ? {
            ...config.postgresReadOnly,
            database: "sponsorTimes"
        } : null
    });

    privateDB = new Postgres({
        dbSchemaFileName: config.privateDBSchema,
        dbSchemaFolder: config.schemaFolder,
        fileNamePrefix: "private",
        readOnly: config.readOnly,
        createDbIfNotExists: config.createDatabaseIfNotExist,
        postgres: {
            ...config.postgres,
            max: config.postgresPrivateMax ?? config.postgres.max,
            database: "privateDB"
        },
        postgresReadOnly: config.postgresReadOnly ? {
            ...config.postgresReadOnly,
            database: "privateDB"
        } : null
    });
} else {
    Logger.error("Sqlite is no longer supported, please migrate to postgres");
}
async function initDb(): Promise<void> {
    await db.init();
    await privateDB.init();

    if (config.mode === "mirror" && db instanceof Postgres) {
        const tables = config?.dumpDatabase?.tables ?? [];
        const tableNames = tables.map(table => table.name);
        for (const table of tableNames) {
            const filePath = `${config?.dumpDatabase?.appExportPath}/${table}.csv`;
            await db.prepare("run", `COPY "${table}" FROM '${filePath}' WITH (FORMAT CSV, HEADER true);`);
        }
    }
}

export {
    db,
    privateDB,
    initDb,
};
