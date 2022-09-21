import { Router } from "express";
export const UserCounter = Router();

UserCounter.post("/api/v1/addIP", (req, res) => {
    res.sendStatus(200);
});
UserCounter.get("/api/v1/userCount", (req, res) => {
    res.send({
        userCount: 100
    });
});