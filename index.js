var express = require('express');
var fs = require('fs');
var http = require('http');
// Create a service (the app object is just a callback).
var app = express();


let config = JSON.parse(fs.readFileSync('config.json'));


// Utils
var getHash = require('./src/utils/getHash.js');
var getIP = require('./src/utils/getIP.js');
var getFormattedTime = require('./src/utils/getFormattedTime.js');

// Routes
var getVideoSponsorTimes = require('./src/routes/getVideoSponsorTimes.js');
var submitSponsorTimes = require('./src/routes/submitSponsorTimes.js');
var voteOnSponsorTime = require('./src/routes/voteOnSponsorTime.js');
var viewedVideoSponsorTime = require('./src/routes/viewedVideoSponsorTime.js');
var setUsername = require('./src/routes/setUsername.js');
var getUsername = require('./src/routes/getUsername.js');
var shadowBanUser = require('./src/routes/shadowBanUser.js');
var addUserAsVIP = require('./src/routes/addUserAsVIP.js');
var getSavedTimeForUser = require('./src/routes/getSavedTimeForUser.js');
var getViewsForUser = require('./src/routes/getViewsForUser.js');
var getTopUsers = require('./src/routes/getTopUsers.js');
var getTotalStats = require('./src/routes/getTotalStats.js');
var getDaysSavedFormatted = require('./src/routes/getDaysSavedFormatted.js');

// YouTube API
const YouTubeAPI = require("youtube-api");
YouTubeAPI.authenticate({
    type: "key",
    key: config.youtubeAPIKey
});

var Sqlite3 = require('better-sqlite3');

let options = {
    readonly: config.readOnly
};

//load database
var db = new Sqlite3(config.db, options);
//where the more sensitive data such as IP addresses are stored
var privateDB = new Sqlite3(config.privateDB, options);

// Create an HTTP service.
http.createServer(app).listen(config.port);

//setup CORS correctly
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//add the get function
app.get('/api/getVideoSponsorTimes', getVideoSponsorTimes);

//add the post function
app.get('/api/postVideoSponsorTimes', submitSponsorTimes);
app.post('/api/postVideoSponsorTimes', submitSponsorTimes);

//voting endpoint
app.get('/api/voteOnSponsorTime', voteOnSponsorTime);
app.post('/api/voteOnSponsorTime', voteOnSponsorTime);

//Endpoint when a sponsorTime is used up
app.get('/api/viewedVideoSponsorTime', viewedVideoSponsorTime);
app.post('/api/viewedVideoSponsorTime', viewedVideoSponsorTime);

//To set your username for the stats view
app.post('/api/setUsername', setUsername);

//get what username this user has
app.get('/api/getUsername', getUsername);

//Endpoint used to hide a certain user's data
app.post('/api/shadowBanUser', shadowBanUser);

//Endpoint used to make a user a VIP user with special privileges
app.post('/api/addUserAsVIP', addUserAsVIP);

//Gets all the views added up for one userID
//Useful to see how much one user has contributed
app.get('/api/getViewsForUser', getViewsForUser);

//Gets all the saved time added up (views * sponsor length) for one userID
//Useful to see how much one user has contributed
//In minutes
app.get('/api/getSavedTimeForUser', getSavedTimeForUser);

app.get('/api/getTopUsers', getTopUsers);

//send out totals
//send the total submissions, total views and total minutes saved
app.get('/api/getTotalStats', getTotalStats);

//send out a formatted time saved total
app.get('/api/getdayssavedformatted', getDaysSavedFormatted);

app.get('/database.db', function (req, res) {
    res.sendfile("./databases/sponsortimes.db", { root: __dirname });
});

