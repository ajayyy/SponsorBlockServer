var MysqlInterface = require('sync-mysql');
var config = require('../config.js');
var logger = require('../utils/logger.js');

class Mysql {
  constructor(msConfig) {
    this.connection = new MysqlInterface(msConfig);
  }

  exec(query) {
    this.prepare('run', query, []);
  }

  prepare (type, query, params) {
    logger.debug("prepare (mysql): type: " + type + ", query: " + query + ", params: " + params);
    if (type === 'get') {
      return this.connection.query(query, params)[0];
    } else if (type === 'run') {
      this.connection.query(query, params);
    } else if (type === 'all') {
      return this.connection.query(query, params);
    } else {
      logger.warn('returning undefined...');
      return undefined;
    }
  }
}

module.exports = Mysql;