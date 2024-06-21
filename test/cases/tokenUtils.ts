import assert from "assert";
import { config } from "../../src/config";
import axios from "axios";
import * as tokenUtils from "../../src/utils/tokenUtils";
import MockAdapter from "axios-mock-adapter";
import { validateLicenseKeyRegex } from "../../src/routes/verifyToken";
let mock: MockAdapter;
import * as patreon from "../mocks/patreonMock";

const validateToken = validateLicenseKeyRegex;

describe("tokenUtils test", function() {
    before(function() {
        mock = new MockAdapter(axios, { onNoMatch: "throwException" });
        mock.onPost("https://www.patreon.com/api/oauth2/token").reply(200, patreon.fakeOauth);
        mock.onGet(/identity/).reply(200, patreon.activeIdentity);
    });

    it("Should be able to create patreon token", async function () {
        if (!config?.patreon) this.skip();
        const licenseKey = await tokenUtils.createAndSaveToken(tokenUtils.TokenType.patreon, "test_code");
        return assert.ok(validateToken(licenseKey[0]));
    });
    it("Should be able to create local token", () =>
        tokenUtils.createAndSaveToken(tokenUtils.TokenType.local)
            .then((licenseKey) => assert.ok(validateToken(licenseKey[0])))
    );
    it("Should be able to get patreon identity", async function () {
        if (!config?.patreon) this.skip();
        const patreon_id = await tokenUtils.getPatreonIdentity("fake_access_token");
        return assert.deepEqual(patreon_id, patreon.activeIdentity);
    });
    it("Should be able to refresh token", async function () {
        if (!config?.patreon) this.skip();
        const patreon_key_valid = await tokenUtils.refreshToken(tokenUtils.TokenType.patreon, "fake-licence-Key", "fake_refresh_token");
        return assert.strictEqual(patreon_key_valid, true);
    });

    after(function () {
        mock.restore();
    });
});

describe("tokenUtils failing tests", function() {
    before(function() {
        mock = new MockAdapter(axios, { onNoMatch: "throwException" });
        mock.onPost("https://www.patreon.com/api/oauth2/token").reply(204, patreon.fakeOauth);
        mock.onGet(/identity/).reply(204, patreon.activeIdentity);
    });

    it("Should fail if patreon is not correctly stubbed", () =>
        tokenUtils.createAndSaveToken(tokenUtils.TokenType.patreon, "test_code")
            .then((licenseKey) => assert.strictEqual(licenseKey, null))
    );
    it("Should fail if token type is invalid", () =>
        tokenUtils.createAndSaveToken("invalidTokenType" as tokenUtils.TokenType)
            .then((licenseKey) => assert.strictEqual(licenseKey, null))
    );

    after(function () {
        mock.restore();
    });
});