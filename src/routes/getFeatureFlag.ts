import { config } from "../config";
import { Request, Response } from "express";

export function getFeatureFlag(req: Request, res: Response): Response {
    const { params: { name } } = req;

    switch (name) {
        case "deArrowPaywall":
            return res.status(200).json({
                enabled: config.deArrowPaywall,
            });
    }
}
