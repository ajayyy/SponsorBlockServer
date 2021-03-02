import {IDatabase, QueryType} from './IDatabase';
import Sqlite3, {Database, Database as SQLiteDatabase} from 'better-sqlite3';
import fs from "fs";
import path from "path";
import {getHash} from '../utils/getHash';
import {Logger} from '../utils/logger';

export class Sqlite implements IDatabase {
    private db: SQLiteDatabase;

    constructor(private config: SqliteConfig)
    {
    }

    async prepare(type: QueryType, query: string, params?: any[]) {
        const preparedQuery = this.db.prepare(query);

        switch (type) {
            case 'get': {
                if (params) {
                    return preparedQuery.get(...params);
                } else {
                    return preparedQuery.get();
                }
            }
            case 'all': {
                if (params) {
                    return preparedQuery.all(...params);
                } else {
                    return preparedQuery.all();
                }
            }
            case 'run': {
                if (params) {
                    preparedQuery.run(...params);
                } else {
                    preparedQuery.run();
                }
                break;
            }
        }
    }

    init() {
        // Make dirs if required
        if (!fs.existsSync(path.join(this.config.dbPath, "../"))) {
            fs.mkdirSync(path.join(this.config.dbPath, "../"));
        }

        this.db = new Sqlite3(this.config.dbPath, {readonly: this.config.readOnly, fileMustExist: !this.config.createDbIfNotExists});

        if (this.config.createDbIfNotExists && !this.config.readOnly && fs.existsSync(this.config.dbSchemaFileName)) {
            this.db.exec(fs.readFileSync(this.config.dbSchemaFileName).toString());
        }

        if (!this.config.readOnly) {
            this.db.function("sha256", (str: string) => {
                return getHash(str, 1);
            });

            // Upgrade database if required
            Sqlite.upgradeDB(this.db, this.config.fileNamePrefix, this.config.dbSchemaFolder);
        }

        // Enable WAL mode checkpoint number
        if (this.config.enableWalCheckpointNumber) {
            this.db.exec("PRAGMA journal_mode=WAL;");
            this.db.exec("PRAGMA wal_autocheckpoint=1;");
        }

        // Enable Memory-Mapped IO
        this.db.exec("pragma mmap_size= 500000000;");
    }

    attachDatabase(database: string, attachAs: string) {
        this.db.prepare(`ATTACH ? as ${attachAs}`).run(database);
    }

    private static upgradeDB(db: Database, fileNamePrefix: string, schemaFolder: string) {
        const versionCodeInfo = db.prepare("SELECT value FROM config WHERE key = ?").get("version");
        let versionCode = versionCodeInfo ? versionCodeInfo.value : 0;

        let path = schemaFolder + "/_upgrade_" + fileNamePrefix + "_" + (parseInt(versionCode) + 1) + ".sql";
        Logger.debug('db update: trying ' + path);
        while (fs.existsSync(path)) {
            Logger.debug('db update: updating ' + path);
            db.exec(fs.readFileSync(path).toString());

            versionCode = db.prepare("SELECT value FROM config WHERE key = ?").get("version").value;
            path = schemaFolder + "/_upgrade_" + fileNamePrefix + "_" + (parseInt(versionCode) + 1) + ".sql";
            Logger.debug('db update: trying ' + path);
        }
        Logger.debug('db update: no file ' + path);
    }
}

export interface SqliteConfig {
    dbPath: string;
    dbSchemaFileName: string;
    dbSchemaFolder: string;
    fileNamePrefix: string;
    readOnly: boolean;
    createDbIfNotExists: boolean;
    enableWalCheckpointNumber: boolean
}
