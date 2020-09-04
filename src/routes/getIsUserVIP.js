var db = require('../databases/databases.js').db;

var getHash = require('../utils/getHash.js');
const logger = require('../utils/logger.js');
const isUserVIP = require('../utils/isUserVIP.js');

module.exports = (req, res) => {
    let userID = req.query.userID;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    try {
        let vipState = isUserVIP(userID);
        res.status(200).json({
            hashedUserID: userID,
            vip: vipState
        });
    } catch (err) {
        logger.error(err);
        res.sendStatus(500);

        return;
    }
}
