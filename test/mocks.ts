import express from "express";
import { config } from "../src/config";
import { Server } from "http";
import { UserCounter } from "./mocks/UserCounter";

const app = express();

app.post("/webhook/ReportChannel", (req, res) => {
    res.sendStatus(200);
});

app.post("/webhook/FirstTimeSubmissions", (req, res) => {
    res.sendStatus(200);
});

app.post("/webhook/CompletelyIncorrectReport", (req, res) => {
    res.sendStatus(200);
});

// Testing NeuralBlock
app.post("/webhook/NeuralBlockReject", (req, res) => {
    res.sendStatus(200);
});

app.get("/NeuralBlock/api/checkSponsorSegments", (req, res) => {
    if (req.query.vid === "LevkAjUE6d4") {
        res.json({
            probabilities: [0.69],
        });
        return;
    }
    res.sendStatus(500);
});

//getSponsorSegments is no longer being used for automod
app.get("/NeuralBlock/api/getSponsorSegments", (req, res) => {
    if (req.query.vid === "LevkAjUE6d4") {
        res.json({
            sponsorSegments: [[0.47, 7.549], [264.023, 317.293]],
        });
        return;
    }
    res.sendStatus(500);
});

// Testing webhooks
app.post("/CustomWebhook", (req, res) => {
    res.sendStatus(200);
});

// mocks
app.use("/UserCounter", UserCounter);

export function createMockServer(callback: () => void): Server {
    return app.listen(config.mockPort, callback);
}
