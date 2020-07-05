const { db } = require("./databases");

class Sqlite {
  constructor(connection) {
    this.connection = connection;
  }

  getConnection() {
    return this.connection;
  }

  prepare(type, query, params) {
    //console.log("prepare:        type: " + type + ", query: " + query + ", params: " + params);
    if (type === 'get') {
      return this.connection.prepare(query).get(...params);
    } else if (type === 'run') {
      this.connection.prepare(query).run(...params);
    } else if (type === 'all') {
      return this.connection.prepare(query).all(...params); 
    } else {
      console.log('returning undefined...')
      console.log("prepare:        type: " + type + ", query: " + query + ", params: " + params);
      return undefined;
    }
  }

  exec(query) {
    return this.connection.exec(query);
  }
}

module.exports = Sqlite;