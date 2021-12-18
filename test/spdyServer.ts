import express from "express";
import spdy from "spdy";
import { config } from "../src/config";
import { Server } from "http";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import selfsigned from "selfsigned";

// generate keys
const attrs = [{ name: "commonName", value: "localhost" }];
const options = {
    keySize: 2048,
    extensions: {
        altNames: [{
            type: 6,
            value: "localhost"
        }]
    }
};
const pem = selfsigned.generate(attrs, options);

const app = express();
app.get("/ping", (req, res) =>
    res.send("pong").status(200)
);

// spdy server if testing
const spdyOptions = {
    key: pem.private,
    cert: pem.cert
};

export const cert = pem.cert;
export const createSpdyServer = (callback: () => void): Server => {
    return spdy.createServer(spdyOptions, app).listen(config.spdyPort, callback);
};