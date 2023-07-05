import { config } from "../config";
import { Sqlite } from "./Sqlite";
import { Postgres } from "./Postgres";
import { IDatabase } from "./IDatabase";

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
            database: "privateDB"
        },
        postgresReadOnly: config.postgresReadOnly ? {
            ...config.postgresReadOnly,
            database: "privateDB"
        } : null
    });
} else {
    db = new Sqlite({
        dbPath: config.db,
        dbSchemaFileName: config.dbSchema,
        dbSchemaFolder: config.schemaFolder,
        fileNamePrefix: "sponsorTimes",
        readOnly: config.readOnly,
        createDbIfNotExists: config.createDatabaseIfNotExist,
        enableWalCheckpointNumber: !config.readOnly && config.mode === "production"
    });
    privateDB = new Sqlite({
        dbPath: config.privateDB,
        dbSchemaFileName: config.privateDBSchema,
        dbSchemaFolder: config.schemaFolder,
        fileNamePrefix: "private",
        readOnly: config.readOnly,
        createDbIfNotExists: config.createDatabaseIfNotExist,
        enableWalCheckpointNumber: false
    });
}
async function initDb(): Promise<void> {
    await db.init();
    await privateDB.init();

    if (db instanceof Sqlite) {
        // Attach private db to main db
        (db as Sqlite).attachDatabase(config.privateDB, "privateDB");
    }

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
