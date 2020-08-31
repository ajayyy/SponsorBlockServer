const databases = require('../../src/databases/databases.js');
const db = databases.db;
const privateDB = databases.privateDB;

describe('dbUpgrade', () => {
  it('Should update the database version when starting the application', (done) => {
    let dbVersion = db.prepare('get', 'SELECT key, value FROM config where key = ?', ['version']).value;
    let privateVersion = privateDB.prepare('get', 'SELECT key, value FROM config where key = ?', ['version']).value;
    if (dbVersion >= 1 && privateVersion >= 1) done();
    else done('Versions are not at least 1. db is ' + dbVersion + ', private is ' + privateVersion);
  });
});