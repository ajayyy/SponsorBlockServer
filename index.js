var express = require('express');
var http = require('http');

// Create a service (the app object is just a callback).
var app = express();

//load database
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./databases/sponsorTimes.db');

// Create an HTTP service.
http.createServer(app).listen(80);

//add the get function
app.get('/api/get', function (req, res) {
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
app.get('/api/get', function (req, res) {

});

app.get('/downloadDatabase', function (req, res) {
    res.sendFile("./databases/sponsorTimes.db");
});