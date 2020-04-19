var getSkipSegments = require("./getSkipSegments.js")


module.exports = function (req, res) {
    let videoID = req.query.videoID;

    let segments = getSkipSegments.handleGetSegments(req, res);

    if (segments) {
        // Convert to old outputs
        let sponsorTimes = [];
        let UUIDs = [];

        for (const segment of segments) {
            sponsorTimes.push(segment.segment);
            UUIDs.push(segment.UUID);
        }

        res.send({
            sponsorTimes,
            UUIDs
        })
    }

    // Error has already been handled in the other method
}