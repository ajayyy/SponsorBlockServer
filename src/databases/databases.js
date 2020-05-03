var config = require('../config.js');
var Sqlite3 = require('better-sqlite3');
var fs = require('fs');
var path = require('path');

let options = {
  readonly: config.readOnly,
  fileMustExist: !config.createDatabaseIfNotExist
};

// Make dirs if required
if (!fs.existsSync(path.join(config.db, "../"))) {
  fs.mkdirSync(path.join(config.db, "../"));
}
if (!fs.existsSync(path.join(config.privateDB, "../"))) {
  fs.mkdirSync(path.join(config.privateDB, "../"));
}

var db = new Sqlite3(config.db, options);
var privateDB = new Sqlite3(config.privateDB, options);

if (config.createDatabaseIfNotExist && !config.readOnly) {
  if (fs.existsSync(config.dbSchema)) db.exec(fs.readFileSync(config.dbSchema).toString());
  if (fs.existsSync(config.privateDBSchema)) privateDB.exec(fs.readFileSync(config.privateDBSchema).toString());
}

// Upgrade database if required
if (!config.readOnly) {
  let versionCodeInfo = db.prepare("SELECT value FROM config WHERE key = ?").get("version");
  let versionCode = versionCodeInfo ? versionCodeInfo.value : 0;

  console.log(versionCode)

  let path = config.schemaFolder + "/_upgrade_" + versionCode + ".sql";
  while (fs.existsSync(path)) {
    db.exec(fs.readFileSync(path).toString());

    versionCode = db.prepare("SELECT value FROM config WHERE key = ?").get("version").value;
    path = config.schemaFolder + "/_upgrade_" + versionCode + ".sql";
  }
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