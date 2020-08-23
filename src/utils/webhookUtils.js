function getVoteAuthorRaw(submissionCount, isVIP, isOwnSubmission) {
    if (isOwnSubmission) {
        return "self";
    } else if (isVIP) {
        return "vip";
    } else if (submissionCount === 0) {
        return "new";
    } else {
        return "other";
    };
};

function getVoteAuthor(submissionCount, isVIP, isOwnSubmission) {
    if (submissionCount === 0) {
        return "Report by New User";
    } else if (isVIP) {
        return "Report by VIP User";
    } else if (isOwnSubmission) {
        return "Report by Submitter";
    }

    return "";
}

module.exports.getVoteAuthorRaw = getVoteAuthorRaw;
module.exports.getVoteAuthor = getVoteAuthor;