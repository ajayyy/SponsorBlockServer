var databases = require('../databases/databases.js');
var db = databases.db;

//returns true if the user is considered trustworthy
//this happens after a user has made 5 submissions and has less than 60% downvoted submissions

module.exports = async (userID) => {
    //check to see if this user how many submissions this user has submitted
    let totalSubmissionsRow = db.prepare('get', "SELECT count(*) as totalSubmissions, sum(votes) as voteSum FROM sponsorTimes WHERE userID = ?", [userID]);

    if (totalSubmissionsRow.totalSubmissions > 5) {
        //check if they have a high downvote ratio
        let downvotedSubmissionsRow = db.prepare('get', "SELECT count(*) as downvotedSubmissions FROM sponsorTimes WHERE userID = ? AND (votes < 0 OR shadowHidden > 0)", [userID]);
        
        return (downvotedSubmissionsRow.downvotedSubmissions / totalSubmissionsRow.totalSubmissions) < 0.6 || 
                (totalSubmissionsRow.voteSum > downvotedSubmissionsRow.downvotedSubmissions);
    }

    return true;
}