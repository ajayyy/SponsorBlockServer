import sinon from "sinon";
import { config } from "../../src/config";
import assert from "assert";
const mode = "production";
let stub: sinon.SinonStub;
let stub2: sinon.SinonStub;
import { createRequest } from "../mocks/mockExpressRequest";
import { getIP } from "../../src/utils/getIP";

const v4RequestOptions = {
    headers: {
        "x-forwarded-for": "127.0.1.1",
        "cf-connecting-ip": "127.0.1.2",
        "x-real-ip": "127.0.1.3",
    },
    ip: "127.0.1.5",
    socket: {
        remoteAddress: "127.0.1.4"
    }
};
const v6RequestOptions = {
    headers: {
        "x-forwarded-for": "[100::1]",
        "cf-connecting-ip": "[100::2]",
        "x-real-ip": "[100::3]",
    },
    ip: "[100::5]",
    socket: {
        remoteAddress: "[100::4]"
    }
};
const v4MockRequest = createRequest(v4RequestOptions);
const v6MockRequest = createRequest(v6RequestOptions);

const expectedIP4 = {
    "X-Forwarded-For": "127.0.1.1",
    "Cloudflare": "127.0.1.2",
    "X-Real-IP": "127.0.1.3",
    "default": "127.0.1.4",
};

const expectedIP6 = {
    "X-Forwarded-For": "[100::1]",
    "Cloudflare": "[100::2]",
    "X-Real-IP": "[100::3]",
    "default": "[100::4]",
};

describe("getIP stubs", () => {
    before(() => stub = sinon.stub(config, "mode").value(mode));
    after(() => stub.restore());

    it("Should return production mode if stub worked", () => {
        assert.strictEqual(config.mode, mode);
    });
});

describe("getIP array tests", () => {
    beforeEach(() => stub = sinon.stub(config, "mode").value(mode));
    afterEach(() => {
        stub.restore();
        stub2.restore();
    });

    for (const [key, value] of Object.entries(expectedIP4)) {
        it(`Should return correct IPv4 from ${key}`, () => {
            stub2 = sinon.stub(config, "behindProxy").value(key);
            const ip = getIP(v4MockRequest);
            assert.strictEqual(config.behindProxy, key);
            assert.strictEqual(ip, value);
        });
    }

    for (const [key, value] of Object.entries(expectedIP6)) {
        it(`Should return correct IPv6 from ${key}`, () => {
            stub2 = sinon.stub(config, "behindProxy").value(key);
            const ip = getIP(v6MockRequest);
            assert.strictEqual(config.behindProxy, key);
            assert.strictEqual(ip, value);
        });
    }
});

describe("getIP true tests", () => {
    before(() => stub = sinon.stub(config, "mode").value(mode));
    after(() => {
        stub.restore();
        stub2.restore();
    });

    it(`Should return correct IPv4 from with bool true`, () => {
        stub2 = sinon.stub(config, "behindProxy").value(true);
        const ip = getIP(v4MockRequest);
        assert.strictEqual(config.behindProxy, "X-Forwarded-For");
        assert.strictEqual(ip, expectedIP4["X-Forwarded-For"]);
    });

    it(`Should return correct IPv4 from with string true`, () => {
        stub2 = sinon.stub(config, "behindProxy").value("true");
        const ip = getIP(v4MockRequest);
        assert.strictEqual(config.behindProxy, "X-Forwarded-For");
        assert.strictEqual(ip, expectedIP4["X-Forwarded-For"]);
    });
});