var postSkipSegments = require('./postSkipSegments.js');

module.exports = async function submitSponsorTimes(req, res) {
    req.query.category = "sponsor";

    return postSkipSegments(req, res);
}
