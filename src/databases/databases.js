var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));
var Sqlite3 = require('better-sqlite3');

let options = {
  readonly: config.readOnly
};

var db = new Sqlite3(config.db, options);
var privateDB = new Sqlite3(config.privateDB, options);

// Enable WAL mode checkpoint number
if (!config.readOnly && config.mode === "production") {
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("PRAGMA wal_autocheckpoint=1;");
}

// Enable Memory-Mapped IO
db.exec("pragma mmap_size= 500000000;");
privateDB.exec("pragma mmap_size= 500000000;");

console.log('databases.js has been executed...');

module.exports = {
  db: db,
  privateDB: privateDB
};