var config = require('../config.js');
var Sqlite3 = require('better-sqlite3');
var fs = require('fs');
var path = require('path');
var Sqlite = require('./Sqlite.js')
var Mysql = require('./Mysql.js');
const logger = require('../utils/logger.js');

let options = {
  readonly: config.readOnly,
  fileMustExist: !config.createDatabaseIfNotExist
};

if (config.mysql) {
  module.exports = {
    db: new Mysql(config.mysql),
    privateDB: new Mysql(config.privateMysql)
  };
} else {
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

  if (!config.readOnly) {
    // Upgrade database if required
    ugradeDB(db, "sponsorTimes");
    ugradeDB(privateDB, "private")

    // Attach private db to main db
    db.prepare("ATTACH ? as privateDB").run(config.privateDB);
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
    db: new Sqlite(db),
    privateDB: new Sqlite(privateDB)
  };

  function ugradeDB(db, prefix) {
    let versionCodeInfo = db.prepare("SELECT value FROM config WHERE key = ?").get("version");
    let versionCode = versionCodeInfo ? versionCodeInfo.value : 0;

    let path = config.schemaFolder + "/_upgrade_" + prefix + "_" + (parseInt(versionCode) + 1) + ".sql";
    logger.debug('db update: trying ' + path);
    while (fs.existsSync(path)) {
      logger.debug('db update: updating ' + path);
      db.exec(fs.readFileSync(path).toString());

      versionCode = db.prepare("SELECT value FROM config WHERE key = ?").get("version").value;
      path = config.schemaFolder + "/_upgrade_" + prefix + "_" + (parseInt(versionCode) + 1) + ".sql";
      logger.debug('db update: trying ' + path);
    }
    logger.debug('db update: no file ' + path);
  }
}