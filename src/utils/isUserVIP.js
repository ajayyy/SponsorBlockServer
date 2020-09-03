const databases = require('../databases/databases.js');
const db = databases.db;

module.exports = (userID) => {
    return db.prepare('get', "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [userID]).userCount > 0;
}


