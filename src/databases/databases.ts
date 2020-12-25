import {config} from '../config';
import {Sqlite} from './Sqlite';
import {Mysql} from './Mysql';
import {IDatabase} from './IDatabase';


let db: IDatabase;
let privateDB: IDatabase;
if (config.mysql) {
    db = new Mysql(config.mysql);
    privateDB = new Mysql(config.privateMysql);
}
else {
    db = new Sqlite({
        dbPath: config.db,
        dbSchemaFileName: config.dbSchema,
        dbSchemaFolder: config.schemaFolder,
        fileNamePrefix: 'sponsorTimes',
        readOnly: config.readOnly,
        createDbIfNotExists: config.createDatabaseIfNotExist,
        enableWalCheckpointNumber: !config.readOnly && config.mode === "production"
    });
    privateDB = new Sqlite({
        dbPath: config.privateDB,
        dbSchemaFileName: config.privateDBSchema,
        dbSchemaFolder: config.schemaFolder,
        fileNamePrefix: 'private',
        readOnly: config.readOnly,
        createDbIfNotExists: config.createDatabaseIfNotExist,
        enableWalCheckpointNumber: false
    });
}
function initDb() {
    db.init();
    privateDB.init();

    if (db instanceof Sqlite) {
        // Attach private db to main db
        (db as Sqlite).attachDatabase(config.privateDB, 'privateDB');
    }
}

export {
    db,
    privateDB,
    initDb,
}
