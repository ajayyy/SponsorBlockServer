var express = require('express');
var http = require('http');

// Create a service (the app object is just a callback).
var app = express();

//uuid service
var uuidv1 = require('uuid/v1');

//load database
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./databases/sponsorTimes.db');

// Create an HTTP service.
http.createServer(app).listen(80);

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

        //send result
        res.send({
            sponsorTimes: sponsorTimes
        })
    });
});

//add the post function
app.get('/api/postVideoSponsorTimes', function (req, res) {
    let videoID = req.query.videoID;
    let startTime = req.query.startTime;
    let endTime = req.query.endTime;

    if (typeof videoID != 'string' || startTime == undefined || endTime == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    startTime = parseFloat(startTime);
    endTime = parseFloat(endTime);

    let UUID = uuidv1();

    db.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?, ?)").run(videoID, startTime, endTime, UUID);

    res.sendStatus(200);
});

app.get('/database.db', function (req, res) {
    res.sendFile("./databases/sponsorTimes.db", { root: __dirname });
});