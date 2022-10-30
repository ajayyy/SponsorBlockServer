import axios from "axios";
import { config } from "../config";
import { privateDB } from "../databases/databases";
import { Logger } from "./logger";
import FormData from "form-data";
import { randomInt } from "node:crypto";

export enum TokenType {
    patreon = "patreon",
    local = "local",
    gumroad = "gumroad"
}

export enum PatronStatus {
    active = "active_patron",
    declined = "declined_patron",
    former = "former_patron",
}

export interface PatreonIdentityData {
    included: Array<{
        attributes: {
            currently_entitled_amount_cents: number,
            campaign_lifetime_support_cents: number,
            pledge_relationship_start: number,
            patron_status: PatronStatus,
        }
    }>
}

export async function createAndSaveToken(type: TokenType, code?: string): Promise<string> {
    switch(type) {
        case TokenType.patreon: {
            const domain = "https://www.patreon.com";
            try {
                const formData = new FormData();
                formData.append("code", code);
                formData.append("client_id", config.patreon.clientId);
                formData.append("client_secret", config.patreon.clientSecret);
                formData.append("grant_type", "authorization_code");
                formData.append("redirect_uri", config.patreon.redirectUri);

                const result = await axios.request({
                    url: `${domain}/api/oauth2/token`,
                    data: formData,
                    method: "POST",
                    headers: formData.getHeaders()
                });

                if (result.status === 200) {
                    const licenseKey = generateToken();
                    const time = Date.now();

                    await privateDB.prepare("run", `INSERT INTO "licenseKeys"("licenseKey", "time", "type") VALUES(?, ?, ?)`, [licenseKey, time, type]);
                    await privateDB.prepare("run", `INSERT INTO "oauthLicenseKeys"("licenseKey", "accessToken", "refreshToken", "expiresIn") VALUES(?, ?, ?, ?)`
                        , [licenseKey, result.data.access_token, result.data.refresh_token, result.data.expires_in]);


                    return licenseKey;
                }
                break;
            } catch (e) /* istanbul ignore next */ {
                Logger.error(`token creation: ${e}`);
                return null;
            }
        }
        case TokenType.local: {
            const licenseKey = generateToken();
            const time = Date.now();

            await privateDB.prepare("run", `INSERT INTO "licenseKeys"("licenseKey", "time", "type") VALUES(?, ?, ?)`, [licenseKey, time, type]);

            return licenseKey;
        }
    }
    return null;
}

export async function refreshToken(type: TokenType, licenseKey: string, refreshToken: string): Promise<boolean> {
    switch(type) {
        case TokenType.patreon: {
            try {
                const formData = new FormData();
                formData.append("refreshToken", refreshToken);
                formData.append("client_id", config.patreon.clientId);
                formData.append("client_secret", config.patreon.clientSecret);
                formData.append("grant_type", "refresh_token");

                const domain = "https://www.patreon.com";
                const result = await axios.request({
                    url: `${domain}/api/oauth2/token`,
                    data: formData,
                    method: "POST",
                    headers: formData.getHeaders()
                });

                if (result.status === 200) {
                    await privateDB.prepare("run", `UPDATE "oauthLicenseKeys" SET "accessToken" = ?, "refreshToken" = ?, "expiresIn" = ? WHERE "licenseKey" = ?`
                        , [result.data.access_token, result.data.refresh_token, result.data.expires_in, licenseKey]);

                    return true;
                }
            } catch (e) /* istanbul ignore next */ {
                Logger.error(`token refresh: ${e}`);
                return false;
            }
        }
    }
    return false;
}

function generateToken(length = 40): string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += charset[randomInt(charset.length)];
    }

    return result;
}

export async function getPatreonIdentity(accessToken: string): Promise<PatreonIdentityData> {
    try {
        const identityRequest = await axios.get(`https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Bmember%5D=patron_status,currently_entitled_amount_cents,campaign_lifetime_support_cents,pledge_relationship_start`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (identityRequest.status === 200) {
            return identityRequest.data;
        }
    } catch (e) /* istanbul ignore next */ {
        Logger.error(`identity request: ${e}`);
    }
    return null;
}