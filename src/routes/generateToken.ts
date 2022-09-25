import { Request, Response } from "express";
import { config } from "../config";
import { createAndSaveToken, TokenType } from "../utils/tokenUtils";


interface GenerateTokenRequest extends Request {
    query: {
        code: string;
        adminUserID?: string;
    },
    params: {
        type: TokenType;
    }
}

export async function generateTokenRequest(req: GenerateTokenRequest, res: Response): Promise<Response> {
    const { query: { code, adminUserID }, params: { type } } = req;

    if (!code || !type) {
        return res.status(400).send("Invalid request");
    }

    if (type === TokenType.patreon || (type === TokenType.local && adminUserID === config.adminUserID)) {
        const licenseKey = await createAndSaveToken(type, code);

        if (licenseKey) {
            return res.status(200).send(`
                <h1>
                    Your license key:
                </h1>
                <p>
                    <b>
                        ${licenseKey}
                    </b>
                </p>
                <p>
                    Copy this into the textbox in the other tab
                </p>
            `);
        } else {
            return res.status(401).send(`
                <h1>
                    Failed to generate an license key
                </h1>
            `);
        }
    } else {
        return res.sendStatus(403);
    }
}