const getHash = require('../utils/getHash.js');
const isUserVIP = require('../utils/isUserVIP.js');

module.exports = (req, res) => {
    // Collect user input data
    let videoID = req.body.videoID;
    let userID = req.body.userID;
    let categorys = req.body.categorys;

    // Check input data is valid
    if (!videoID 
        || !userID 
        || !categorys 
        || !Array.isArray(categorys) 
        || categorys.length === 0
    ) {
        res.status(400).json({});
        return;
    }

    // Check if user is VIP
    userID = getHash(userID);
    let userIsVIP = isUserVIP(userID);

    if (!userIsVIP) {
        res.status(403).json({});
        return;
    }

    res.status(200).json({status: 200}); 
};