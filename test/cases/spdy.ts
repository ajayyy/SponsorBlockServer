import { config } from "../../src/config";
import assert from "assert";
import superagent from "superagent";
import { cert } from "../spdyServer";

describe("spdy test", () => {
    // skip tests if no config.spdyPort
    before(function () {
        if (!config?.spdyPort) this.skip();
    });
    it("Should be able to get with HTTP/2", (done) => {
        superagent
            .get(`https://localhost:${config.spdyPort}/ping`)
            .http2()
            .ca(cert)
            .end((err, res) => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.text, "pong");
                if (err) assert.fail(err);
                done();
            });
    });

    it("Should give error when fetching from HTTP/1 server", (done) => {
        superagent
            .get(`http://localhost:${config.port}/api/status`)
            .http2()
            .end((err, result) => {
                if (result) assert.fail("Expecting error, not result");
                assert.deepStrictEqual(err?.code, "ERR_HTTP2_ERROR");
                done();
            });
    });
});