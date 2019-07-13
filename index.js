var express = require('express');
var http = require('http');

// Create a service (the app object is just a callback).
var app = express();

//uuid service
var uuidv1 = require('uuid/v1');

//hashing service
var crypto = require('crypto');

//load database
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./databases/sponsorTimes.db');

// Create an HTTP service.
http.createServer(app).listen(80);

//global salt that is added to every ip before hashing to
//  make it even harder for someone to decode the ip
var globalSalt = "49cb0d52-1aec-4b89-85fc-fab2c53062fb";

//setup CORS correctly
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//add the get function
app.get('/api/getVideoSponsorTimes', function (req, res) {
    let videoID = req.query.videoID;

    let sponsorTimes = [];

    db.prepare("SELECT startTime, endTime FROM sponsorTimes WHERE videoID = ?").all(videoID, function(err, rows) {
        if (err) console.log(err);

        for (let i = 0; i < rows.length; i++) {
            sponsorTimes[i] = [];
    
            sponsorTimes[i][0] = rows[i].startTime;
            sponsorTimes[i][1] = rows[i].endTime;
        }

        if (sponsorTimes.length == 0) {
            res.sendStatus(404);
        } else {
            //send result
            res.send({
                sponsorTimes: sponsorTimes
            })
        }
    });
});

//add the post function
app.get('/api/postVideoSponsorTimes', function (req, res) {
    let videoID = req.query.videoID;
    let startTime = req.query.startTime;
    let endTime = req.query.endTime;
    let userID = req.query.userID;

    if (typeof videoID != 'string' || startTime == undefined || endTime == undefined || userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //x-forwarded-for if this server is behind a proxy
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    //hash the ip so no one can get it from the database
    let hashCreator = crypto.createHash('sha256');
    let hashedIP = hashCreator.update(ip + globalSalt).digest('hex');

    startTime = parseFloat(startTime);
    endTime = parseFloat(endTime);

    let UUID = uuidv1();

    //get current time
    let timeSubmitted = Date.now();

    //check to see if the user has already submitted sponsors for this video
    db.prepare("SELECT UUID FROM sponsorTimes WHERE userID = ? and videoID = ?").all([userID, videoID], function(err, rows) {
        if (rows.length >= 4) {
            //too many sponsors for the same video from the same user
            res.sendStatus(429);
        } else {
            //check if this info has already been submitted first
            db.prepare("SELECT UUID FROM sponsorTimes WHERE startTime = ? and endTime = ? and videoID = ?").get([startTime, endTime, videoID], function(err, row) {
                if (err) console.log(err);
                
                if (row == null) {
                    //not a duplicate, execute query
                    db.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?, ?, ?, ?, ?)").run(videoID, startTime, endTime, UUID, userID, hashedIP, timeSubmitted);

                    res.sendStatus(200);
                } else {
                    res.sendStatus(409);
                }
            });
        }
    });
});

app.get('/database.db', function (req, res) {
    res.sendFile("./databases/sponsorTimes.db", { root: __dirname });
});