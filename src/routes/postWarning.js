const db = require('../databases/databases.js').db;
const getHash = require('../utils/getHash.js');
const isUserVIP = require('../utils/isUserVIP.js');
const logger = require('../utils/logger.js');

module.exports = (req, res) => {
    // Collect user input data
    let issuerUserID = getHash(req.body.issuerUserID);
    let userID = getHash(req.body.userID);
    let issueTime = new Date().getTime();

    // Ensure user is a VIP
    if (!isUserVIP(issuerUserID)) {
        logger.debug("Permission violation: User " + issuerUserID + " attempted to warn user " + userID + "."); // maybe warn?
        res.status(403).json({"message": "Not a VIP"});
        return;
    }

    db.prepare('run', 'INSERT INTO warnings (userID, issueTime, issuerUserID) VALUES (?, ?, ?)', [userID, issueTime, issuerUserID]);
    res.status(200).json({
        message: "Warning issued to user '" + userID + "'."
    });

};