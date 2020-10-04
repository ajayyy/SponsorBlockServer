var express = require('express');
// Create a service (the app object is just a callback).
var app = express();
var config = require('./config.js');
var redis = require('./utils/redis.js');

// Middleware 
var corsMiddleware = require('./middleware/cors.js');
var loggerMiddleware = require('./middleware/logger.js');
const userCounter = require('./middleware/userCounter.js');

// Routes
var getSkipSegments = require('./routes/getSkipSegments.js').endpoint;
var postSkipSegments = require('./routes/postSkipSegments.js');
var getSkipSegmentsByHash = require('./routes/getSkipSegmentsByHash.js');
var voteOnSponsorTime = require('./routes/voteOnSponsorTime.js');
var viewedVideoSponsorTime = require('./routes/viewedVideoSponsorTime.js');
var setUsername = require('./routes/setUsername.js');
var getUsername = require('./routes/getUsername.js');
var shadowBanUser = require('./routes/shadowBanUser.js');
var addUserAsVIP = require('./routes/addUserAsVIP.js');
var getSavedTimeForUser = require('./routes/getSavedTimeForUser.js');
var getViewsForUser = require('./routes/getViewsForUser.js');
var getTopUsers = require('./routes/getTopUsers.js');
var getTotalStats = require('./routes/getTotalStats.js');
var getDaysSavedFormatted = require('./routes/getDaysSavedFormatted.js');
var postNoSegments = require('./routes/postNoSegments.js');
var getIsUserVIP = require('./routes/getIsUserVIP.js');
var postSegmentShift = require('./routes/postSegmentShift.js');

// Old Routes
var oldGetVideoSponsorTimes = require('./routes/oldGetVideoSponsorTimes.js');
var oldSubmitSponsorTimes = require('./routes/oldSubmitSponsorTimes.js');

//setup CORS correctly
app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(express.json())

if (config.userCounterURL) app.use(userCounter);

// Setup pretty JSON
if (config.mode === "development") app.set('json spaces', 2);

// Set production mode
app.set('env', config.mode || 'production');

//add the get function
app.get('/api/getVideoSponsorTimes', oldGetVideoSponsorTimes);

//add the oldpost function
app.get('/api/postVideoSponsorTimes', oldSubmitSponsorTimes);
app.post('/api/postVideoSponsorTimes', oldSubmitSponsorTimes);

//add the skip segments functions
app.get('/api/skipSegments', getSkipSegments);
app.post('/api/skipSegments', postSkipSegments);

// add the privacy protecting skip segments functions
app.get('/api/skipSegments/:prefix', getSkipSegmentsByHash);

//voting endpoint
app.get('/api/voteOnSponsorTime', voteOnSponsorTime.endpoint);
app.post('/api/voteOnSponsorTime', voteOnSponsorTime.endpoint);

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
app.get('/api/getDaysSavedFormatted', getDaysSavedFormatted);

//submit video containing no segments
app.post('/api/noSegments', postNoSegments);

//get if user is a vip
app.get('/api/isUserVIP', getIsUserVIP);

//get if user is a vip
app.post('/api/segmentShift', postSegmentShift);


app.get('/database.db', function (req, res) {
    res.sendFile("./databases/sponsorTimes.db", { root: "./" });
});

// Create an HTTP service.
module.exports = function createServer (callback) {
    return app.listen(config.port, callback);
}
