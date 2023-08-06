import { Request, Response } from "express";
import { config } from "../config";
import { createAndSaveToken, TokenType } from "../utils/tokenUtils";
import { getHashCache } from "../utils/getHashCache";

interface GenerateTokenRequest extends Request {
    query: {
        code: string;
        adminUserID?: string;
        total?: string;
        key?: string;
    },
    params: {
        type: TokenType;
    }
}

export async function generateTokenRequest(req: GenerateTokenRequest, res: Response): Promise<Response> {
    const { query: { code, adminUserID, total, key }, params: { type } } = req;
    const adminUserIDHash = adminUserID ? (await getHashCache(adminUserID)) : null;

    if (!type || (!code && type === TokenType.patreon)) {
        return res.status(400).send("Invalid request");
    }

    if (type === TokenType.free && (!key || Math.abs(Date.now() - parseInt(key)) > 1000 * 60 * 60 * 24)) {
        return res.status(400).send("Invalid request");
    }

    if (type === TokenType.patreon
            || ([TokenType.local, TokenType.gift].includes(type) && adminUserIDHash === config.adminUserID)
            || type === TokenType.free) {
        const licenseKeys = await createAndSaveToken(type, code, adminUserIDHash === config.adminUserID ? parseInt(total) : 1);

        /* istanbul ignore else */
        if (licenseKeys) {
            if (type === TokenType.patreon) {
                return res.status(200).send(`
                    <h1>
                        Your license key:
                    </h1>
                    <p>
                        <b>
                            ${licenseKeys[0]}
                        </b>
                    </p>
                    <p>
                        Copy this into the textbox in the other tab
                    </p>
                `);
            } else if (type === TokenType.free) {
                return res.status(200).send({
                    licenseKey: licenseKeys[0]
                });
            } else {
                return res.status(200).send(licenseKeys.join("<br/>"));
            }
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