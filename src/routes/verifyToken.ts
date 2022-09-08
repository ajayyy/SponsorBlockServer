import axios from "axios";
import { Request, Response } from "express";
import { config } from "../config";
import { privateDB } from "../databases/databases";
import { Logger } from "../utils/logger";
import { getPatreonIdentity, PatronStatus, refreshToken, TokenType } from "../utils/tokenUtils";
import FormData from "form-data";

interface VerifyTokenRequest extends Request {
    query: {
        licenseKey: string;
    }
}

export async function verifyTokenRequest(req: VerifyTokenRequest, res: Response): Promise<Response> {
    const { query: { licenseKey } } = req;

    if (!licenseKey) {
        return res.status(400).send("Invalid request");
    }

    const tokens = (await privateDB.prepare("get", `SELECT "accessToken", "refreshToken", "expiresIn" from "oauthLicenseKeys" WHERE "licenseKey" = ?`
        , [licenseKey])) as {accessToken: string, refreshToken: string, expiresIn: number};
    if (tokens) {
        const identity = await getPatreonIdentity(tokens.accessToken);

        if (tokens.expiresIn < 15 * 24 * 60 * 60) {
            refreshToken(TokenType.patreon, licenseKey, tokens.refreshToken).catch(Logger.error);
        }

        if (identity) {
            const membership = identity.included?.[0]?.attributes;
            const allowed = !!membership && ((membership.patron_status === PatronStatus.active && membership.currently_entitled_amount_cents > 0)
                || (membership.patron_status === PatronStatus.former && membership.campaign_lifetime_support_cents > 300));

            return res.status(200).send({
                allowed
            });
        } else {
            return res.status(500);
        }
    } else {
        // Check Local
        const result = await privateDB.prepare("get", `SELECT "licenseKey" from "licenseKeys" WHERE "licenseKey" = ?`, [licenseKey]);
        if (result) {
            return res.status(200).send({
                allowed: true
            });
        } else {
            // Gumroad
            return res.status(200).send({
                allowed: await checkAllGumroadProducts(licenseKey)
            });
        }

    }
}

async function checkAllGumroadProducts(licenseKey: string): Promise<boolean> {
    for (const link of config.gumroad.productPermalinks) {
        try {
            const formData = new FormData();
            formData.append("product_permalink", link);
            formData.append("license_key", licenseKey);

            const result = await axios.request({
                url: "https://api.gumroad.com/v2/licenses/verify",
                data: formData,
                method: "POST",
                headers: formData.getHeaders()
            });

            const allowed = result.status === 200 && result.data?.success;
            if (allowed) return allowed;
        } catch (e) {
            Logger.error(`Gumroad fetch for ${link} failed: ${e}`);
        }
    }

    return false;
}