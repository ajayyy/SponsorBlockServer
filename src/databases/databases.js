var config = require('../config.js');
var Sqlite3 = require('better-sqlite3');
var fs = require('fs');

let options = {
  readonly: config.readOnly,
  fileMustExist: !config.createDatabaseIfNotExist
};

var db = new Sqlite3(config.db, options);
var privateDB = new Sqlite3(config.privateDB, options);

if (config.createDatabaseIfNotExist && !config.readOnly) {
  if (fs.existsSync(config.dbSchema)) db.exec(fs.readFileSync(config.dbSchema).toString());
  if (fs.existsSync(config.privateDBSchema)) privateDB.exec(fs.readFileSync(config.privateDBSchema).toString());
}

// Enable WAL mode checkpoint number
if (!config.readOnly && config.mode === "production") {
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("PRAGMA wal_autocheckpoint=1;");
}

// Enable Memory-Mapped IO
db.exec("pragma mmap_size= 500000000;");
privateDB.exec("pragma mmap_size= 500000000;");

module.exports = {
  db: db,
  privateDB: privateDB
};