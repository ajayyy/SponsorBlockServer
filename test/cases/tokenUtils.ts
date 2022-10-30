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

    it("Should be able to create patreon token", function (done) {
        if (!config?.patreon) this.skip();
        tokenUtils.createAndSaveToken(tokenUtils.TokenType.patreon, "test_code").then((licenseKey) => {
            assert.ok(validateToken(licenseKey));
            done();
        });
    });
    it("Should be able to create local token", (done) => {
        tokenUtils.createAndSaveToken(tokenUtils.TokenType.local).then((licenseKey) => {
            assert.ok(validateToken(licenseKey));
            done();
        });
    });
    it("Should be able to get patreon identity", function (done) {
        if (!config?.patreon) this.skip();
        tokenUtils.getPatreonIdentity("fake_access_token").then((result) => {
            assert.deepEqual(result, patreon.activeIdentity);
            done();
        });
    });
    it("Should be able to refresh token", function (done) {
        if (!config?.patreon) this.skip();
        tokenUtils.refreshToken(tokenUtils.TokenType.patreon, "fake-licence-Key", "fake_refresh_token").then((result) => {
            assert.strictEqual(result, true);
            done();
        });
    });

    after(function () {
        mock.restore();
    });
});