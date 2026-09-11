import { Request, Response } from "express";

import { config } from "../config.js";

export function getFeatureFlag(req: Request, res: Response): Response {
    const { params: { name } } = req;

    switch (name) {
        case "deArrowPaywall":
            return res.status(200).json({
                enabled: config.deArrowPaywall,
            });
    }

    return res.status(404).json();
}
