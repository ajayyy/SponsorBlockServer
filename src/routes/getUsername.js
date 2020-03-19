var db = require('../databases/databases.js').db;

var getHash = require('../utils/getHash.js');

module.exports = function getUsername (req, res) {
    let userID = req.query.userID;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    try {
        let row = db.prepare("SELECT userName FROM userNames WHERE userID = ?").get(userID);

        if (row !== undefined) {
            res.send({
                userName: row.userName
            });
        } else {
            //no username yet, just send back the userID
            res.send({
                userName: userID
            });
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);

        return;
    }
}