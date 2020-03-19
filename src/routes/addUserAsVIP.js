var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));

var db = require('../databases/databases.js').db;
var getHash = require('../utils/getHash.js');


module.exports = async function addUserAsVIP (req, res) {
    let userID = req.query.userID;
    let adminUserIDInput = req.query.adminUserID;

    let enabled = req.query.enabled;
    if (enabled === undefined){
        enabled = true;
    } else {
        enabled = enabled === "true";
    }

    if (userID == undefined || adminUserIDInput == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    adminUserIDInput = getHash(adminUserIDInput);

    if (adminUserIDInput !== adminUserID) {
        //not authorized
        res.sendStatus(403);
        return;
    }

    //check to see if this user is already a vip
    let row = db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(userID);

    if (enabled && row.userCount == 0) {
        //add them to the vip list
        db.prepare("INSERT INTO vipUsers VALUES(?)").run(userID);
    } else if (!enabled && row.userCount > 0) {
        //remove them from the shadow ban list
        db.prepare("DELETE FROM vipUsers WHERE userID = ?").run(userID);
    }

    res.sendStatus(200);
}