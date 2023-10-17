import assert from "assert";
import { config } from "../../src/config";
import axios from "axios";
import { createAndSaveToken, TokenType } from "../../src/utils/tokenUtils";
import MockAdapter from "axios-mock-adapter";
let mock: MockAdapter;
import * as patreon from "../mocks/patreonMock";
import * as gumroad from "../mocks/gumroadMock";
import { client } from "../utils/httpClient";
import { validateLicenseKeyRegex } from "../../src/routes/verifyToken";

const generateEndpoint = "/api/generateToken";
const getGenerateToken = (type: string, code: string | null, adminUserID: string | null) => client({
    url: `${generateEndpoint}/${type}`,
    params: { code, adminUserID }
});

const verifyEndpoint = "/api/verifyToken";
const getVerifyToken = (licenseKey: string | null) => client({
    url: verifyEndpoint,
    params: { licenseKey }
});

let patreonLicense: string;
let localLicense: string;
const gumroadLicense = gumroad.generateLicense();

const extractLicenseKey = (data: string) => {
    const regex = /([A-Za-z0-9-]{5}-[A-Za-z0-9-]{5})/;
    const match = data.match(regex);
    if (!match) throw new Error("Failed to extract license key");
    return match[1];
};

describe("generateToken test", function() {

    before(function() {
        mock = new MockAdapter(axios, { onNoMatch: "throwException" });
        mock.onPost("https://www.patreon.com/api/oauth2/token").reply(200, patreon.fakeOauth);
    });

    after(function () {
        mock.restore();
    });

    it("Should be able to create patreon token for active patron", function () {
        mock.onGet(/identity/).reply(200, patreon.activeIdentity);
        if (!config?.patreon) this.skip();
        return getGenerateToken("patreon", "patreon_code", "").then(res => {
            patreonLicense = extractLicenseKey(res.data);
            assert.ok(validateLicenseKeyRegex(patreonLicense));
        });
    });

    it("Should create patreon token for invalid patron", function () {
        mock.onGet(/identity/).reply(200, patreon.formerIdentityFail);
        if (!config?.patreon) this.skip();
        return getGenerateToken("patreon", "patreon_code", "").then(res => {
            patreonLicense = extractLicenseKey(res.data);
            assert.ok(validateLicenseKeyRegex(patreonLicense));
        });
    });

    it("Should be able to create new local token", () =>
        createAndSaveToken(TokenType.local).then((licenseKey) => {
            assert.ok(validateLicenseKeyRegex(licenseKey[0]));
            localLicense = licenseKey[0];
        })
    );

    it("Should return 400 if missing code parameter", () =>
        getGenerateToken("patreon", null, "").then(res => {
            assert.strictEqual(res.status, 400);
        })
    );

    it("Should return 403 if missing adminuserID parameter", () =>
        getGenerateToken("local", "fake-code", null).then(res => {
            assert.strictEqual(res.status, 403);
        })
    );

    it("Should return 403 for invalid adminuserID parameter", () => {
        getGenerateToken("local", "fake-code", "fakeAdminID")
            .then(res => assert.strictEqual(res.status, 403));
    });
});

describe("verifyToken static tests", function() {
    it("Should fast reject invalid token", () =>
        getVerifyToken("00000").then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(!res.data.allowed);
        })
    );

    it("Should return 400 if missing code token", () =>
        getVerifyToken(null).then(res =>
            assert.strictEqual(res.status, 400)
        )
    );
});

describe("verifyToken mock tests", function() {

    beforeEach(function() {
        mock = new MockAdapter(axios, { onNoMatch: "throwException" });
        mock.onPost("https://www.patreon.com/api/oauth2/token").reply(200, patreon.fakeOauth);
    });

    afterEach(function () {
        mock.restore();
    });

    it("Should accept current patron", function () {
        if (!config?.patreon) this.skip();
        mock.onGet(/identity/).reply(200, patreon.activeIdentity);
        return getVerifyToken(patreonLicense).then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(res.data.allowed);
        });
    });

    it("Should reject nonexistent patron", function () {
        if (!config?.patreon) this.skip();
        mock.onGet(/identity/).reply(200, patreon.invalidIdentity);
        return getVerifyToken(patreonLicense).then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(!res.data.allowed);
        });
    });

    it("Should accept qualitying former patron", function () {
        if (!config?.patreon) this.skip();
        mock.onGet(/identity/).reply(200, patreon.formerIdentitySucceed);
        return getVerifyToken(patreonLicense).then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(res.data.allowed);
        });
    });

    it("Should reject unqualitifed former patron", function () {
        if (!config?.patreon) this.skip();
        mock.onGet(/identity/).reply(200, patreon.formerIdentityFail);
        return getVerifyToken(patreonLicense).then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(!res.data.allowed);
        });
    });

    it("Should accept real gumroad key", () => {
        mock.onPost("https://api.gumroad.com/v2/licenses/verify").reply(200, gumroad.licenseSuccess);
        return getVerifyToken(gumroadLicense).then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(res.data.allowed);
        });
    });

    it("Should reject fake gumroad key", () => {
        mock.onPost("https://api.gumroad.com/v2/licenses/verify").reply(200, gumroad.licenseFail);
        return getVerifyToken(gumroadLicense).then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(!res.data.allowed);
        });
    });

    it("Should validate local license", () =>
        getVerifyToken(localLicense).then(res => {
            assert.strictEqual(res.status, 200);
            assert.ok(res.data.allowed);
        })
    );
});
