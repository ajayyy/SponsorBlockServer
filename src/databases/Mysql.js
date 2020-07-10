var MysqlInterface = require('sync-mysql');

class Mysql {
  constructor(config) {
    this.connection = new MysqlInterface(config);
  }

  exec(query) {
    this.prepare('run', query, []);
  }

  prepare (type, query, params) {
    (config.mode === "development") && console.log("prepare (mysql): type: " + type + ", query: " + query + ", params: " + params);
    if (type === 'get') {
      return this.connection.query(query, params)[0];
    } else if (type === 'run') {
      this.connection.query(query, params);
    } else if (type === 'all') {
      return this.connection.query(query, params);
    } else {
      console.log('returning undefined...')
      return undefined;
    }
  }
}

module.exports = Mysql;